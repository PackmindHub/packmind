import {
  describeForVersion,
  describeWithExtraUser,
  fileExists,
  readFile,
  RunCliResult,
  setupGitRepo,
  updateFile,
  WithMemberContext,
} from './helpers';
import { Package, Recipe, Space, SpaceType } from '@packmind/types';

describeForVersion('>= 0.26.0', 'install command with unjoined spaces', () => {
  describeWithExtraUser(
    'install command with unjoined spaces',
    (getContext) => {
      let context: WithMemberContext;

      let publicSpace: Space;
      let publicPackage: Package;
      let publicCommand: Recipe;

      let privateSpace: Space;
      let privatePackage: Package;
      let privateCommand: Recipe;

      beforeEach(async () => {
        context = await getContext();
        await setupGitRepo(context.testDir);

        publicSpace = await context.gateway.spaces.create({
          name: 'Public space',
          type: SpaceType.open,
        });
        publicCommand = await context.gateway.commands.create({
          name: 'Public command',
          content: 'This is my public command',
          spaceId: publicSpace.id,
        });
        const createPublicPackageResponse =
          await context.gateway.packages.create({
            name: 'Public package',
            description: '',
            recipeIds: [publicCommand.id],
            standardIds: [],
            spaceId: publicSpace.id,
          });
        publicPackage = createPublicPackageResponse.package;

        privateSpace = await context.gateway.spaces.create({
          name: 'Private space',
          type: SpaceType.private,
        });
        privateCommand = await context.gateway.commands.create({
          name: 'Private command',
          content: 'This is my private command',
          spaceId: privateSpace.id,
        });
        const createPrivatePackageResponse =
          await context.gateway.packages.create({
            name: 'Private package',
            description: '',
            recipeIds: [privateCommand.id],
            standardIds: [],
            spaceId: privateSpace.id,
          });
        privatePackage = createPrivatePackageResponse.package;
      });

      describe('when packages have been previously installed by someone with all access', () => {
        beforeEach(async () => {
          await context.runCli(
            `install @${publicSpace.slug}/${publicPackage.slug} @${privateSpace.slug}/${privatePackage.slug}`,
          );
        });

        it('installs the artefacts from the public spaces', () => {
          expect(
            readFile(
              `.packmind/commands/${publicCommand.slug}.md`,
              context.testDir,
            ),
          )?.toEqual(publicCommand.content);
        });

        it('installs the artefacts from the private spaces', () => {
          expect(
            readFile(
              `.packmind/commands/${privateCommand.slug}.md`,
              context.testDir,
            ),
          )?.toEqual(privateCommand.content);
        });

        it('references all artefacts in the indices', () => {
          expect(
            readFile(`.packmind/commands-index.md`, context.testDir).split(
              '\n',
            ),
          ).toEqual(
            expect.arrayContaining([
              expect.stringContaining(
                `[${privateCommand.name}](commands/${privateCommand.slug}.md)`,
              ),
              expect.stringContaining(
                `[${publicCommand.name}](commands/${publicCommand.slug}.md)`,
              ),
            ]),
          );
        });

        it('references all artefacts in packmind-lock.json', () => {
          const packmindLock = JSON.parse(
            readFile(`packmind-lock.json`, context.testDir),
          );

          expect(packmindLock).toMatchObject({
            artifacts: {
              [`command:${publicCommand.slug}`]: expect.objectContaining({
                id: publicCommand.id,
                name: publicCommand.name,
              }),
              [`command:${privateCommand.slug}`]: expect.objectContaining({
                id: privateCommand.id,
                name: privateCommand.name,
              }),
            },
          });
        });

        it('notifies Packmind that the private command was deployed', async () => {
          const overview =
            await context.gateway.deployments.listActiveDistributedPackagesBySpace(
              {
                spaceId: privateSpace.id,
              },
            );

          expect(overview).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                packages: expect.arrayContaining([
                  expect.objectContaining({
                    packageId: privatePackage.id,
                    deployedRecipes: expect.arrayContaining([
                      expect.objectContaining({
                        recipe: expect.objectContaining({
                          id: privateCommand.id,
                        }),
                        isUpToDate: true,
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          );
        });

        it('notifies Packmind that the public command was deployed', async () => {
          const overview =
            await context.gateway.deployments.listActiveDistributedPackagesBySpace(
              {
                spaceId: publicSpace.id,
              },
            );

          expect(overview).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                packages: expect.arrayContaining([
                  expect.objectContaining({
                    packageId: publicPackage.id,
                    deployedRecipes: expect.arrayContaining([
                      expect.objectContaining({
                        recipe: expect.objectContaining({
                          id: publicCommand.id,
                        }),
                        isUpToDate: true,
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          );
        });

        describe('when user without access to the spaces runs install', () => {
          let installResult: RunCliResult;

          beforeEach(async () => {
            installResult = await context.runCli('install', {
              apiKey: context.extraUserApiKey,
            });
          });

          it('succeeds', async () => {
            expect(installResult).toEqual({
              returnCode: 0,
              stderr:
                expect.toMatchOutput(`You don't have access to the following packages (their artifacts were preserved from the lock file):
- @private-space/private-package
- @public-space/public-package`),
              stdout: expect.toMatchOutput('Nothing to install'),
            });
          });

          it('keeps the references to the hidden artefacts in the indices', () => {
            expect(
              readFile(`.packmind/commands-index.md`, context.testDir).split(
                '\n',
              ),
            ).toEqual(
              expect.arrayContaining([
                expect.stringContaining(
                  `[${privateCommand.name}](commands/${privateCommand.slug}.md)`,
                ),
                expect.stringContaining(
                  `[${publicCommand.name}](commands/${publicCommand.slug}.md)`,
                ),
              ]),
            );
          });

          it('references all artefacts in packmind-lock.json', () => {
            const packmindLock = JSON.parse(
              readFile(`packmind-lock.json`, context.testDir),
            );

            expect(packmindLock).toMatchObject({
              artifacts: {
                [`command:${publicCommand.slug}`]: expect.objectContaining({
                  id: publicCommand.id,
                  name: publicCommand.name,
                }),
                [`command:${privateCommand.slug}`]: expect.objectContaining({
                  id: privateCommand.id,
                  name: privateCommand.name,
                }),
              },
            });
          });
        });

        describe('when an artefact is updated', () => {
          const newCommandContent = 'My updated command';

          beforeEach(async () => {
            await context.gateway.commands.update({
              recipeId: privateCommand.id,
              spaceId: privateSpace.id,
              name: privateCommand.name,
              content: newCommandContent,
            });
          });

          describe('when installing with access', () => {
            beforeEach(async () => {
              await context.runCli('install');
            });

            it('updates the artefact', () => {
              expect(
                readFile(
                  `.packmind/commands/${privateCommand.slug}.md`,
                  context.testDir,
                ),
              )?.toEqual(newCommandContent);
            });

            it('updates the packmind-lock.json file with the correct version', () => {
              const packmindLock = JSON.parse(
                readFile(`packmind-lock.json`, context.testDir),
              );

              expect(packmindLock).toMatchObject({
                artifacts: {
                  [`command:${privateCommand.slug}`]: expect.objectContaining({
                    id: privateCommand.id,
                    name: privateCommand.name,
                    version: 2,
                  }),
                },
              });
            });

            it('notifies Packmind that the private command update was deployed', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: privateSpace.id,
                  },
                );

              expect(overview).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    packages: expect.arrayContaining([
                      expect.objectContaining({
                        packageId: privatePackage.id,
                        deployedRecipes: expect.arrayContaining([
                          expect.objectContaining({
                            recipe: expect.objectContaining({
                              id: privateCommand.id,
                            }),
                            isUpToDate: true,
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              );
            });

            it('notifies Packmind that the public command is still up-to-date', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: publicSpace.id,
                  },
                );

              expect(overview).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    packages: expect.arrayContaining([
                      expect.objectContaining({
                        packageId: publicPackage.id,
                        deployedRecipes: expect.arrayContaining([
                          expect.objectContaining({
                            recipe: expect.objectContaining({
                              id: publicCommand.id,
                            }),
                            isUpToDate: true,
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              );
            });
          });

          describe('when installing without access', () => {
            let installResult: RunCliResult;

            beforeEach(async () => {
              installResult = await context.runCli('install', {
                apiKey: context.extraUserApiKey,
              });
            });

            it('succeeds but warn the user that some packages are not installed', async () => {
              expect(installResult.returnCode).toEqual(0);
            });

            it('does not update the artefact', () => {
              expect(
                readFile(
                  `.packmind/commands/${privateCommand.slug}.md`,
                  context.testDir,
                ),
              )?.toEqual(privateCommand.content);
            });

            it('keeps the installed version in the packmind-lock.json file', () => {
              const packmindLock = JSON.parse(
                readFile(`packmind-lock.json`, context.testDir),
              );

              expect(packmindLock).toMatchObject({
                artifacts: {
                  [`command:${privateCommand.slug}`]: expect.objectContaining({
                    id: privateCommand.id,
                    name: privateCommand.name,
                    version: 1,
                  }),
                },
              });
            });

            it('does not update the distributed version of the private command in Packmind', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: privateSpace.id,
                  },
                );

              expect(overview).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    packages: expect.arrayContaining([
                      expect.objectContaining({
                        packageId: privatePackage.id,
                        deployedRecipes: expect.arrayContaining([
                          expect.objectContaining({
                            recipe: expect.objectContaining({
                              id: privateCommand.id,
                            }),
                            isUpToDate: false,
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              );
            });

            it('keeps the distributed version of the public command as up-to-date in Packmind', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: publicSpace.id,
                  },
                );

              expect(overview).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    packages: expect.arrayContaining([
                      expect.objectContaining({
                        packageId: publicPackage.id,
                        deployedRecipes: expect.arrayContaining([
                          expect.objectContaining({
                            recipe: expect.objectContaining({
                              id: publicCommand.id,
                            }),
                            isUpToDate: true,
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              );
            });
          });
        });

        describe('when removing packages', () => {
          beforeEach(() => {
            const currentPackmindJson = JSON.parse(
              readFile('packmind.json', context.testDir),
            );

            updateFile(
              'packmind.json',
              JSON.stringify(
                {
                  ...currentPackmindJson,
                  packages: {
                    [`@${publicSpace.slug}/${publicPackage.slug}`]: '*',
                  },
                },
                null,
                2,
              ),
              context.testDir,
            );
          });

          describe('when installing with access to all packages ', () => {
            beforeEach(async () => {
              await context.runCli('install');
            });

            it('removes the files from the removed package', () => {
              expect(
                fileExists(
                  `.packmind/commands/${privateCommand.slug}.md`,
                  context.testDir,
                ),
              ).toEqual(false);
            });

            it('removes the references to the removed artefacts in the indices', () => {
              expect(
                readFile(`.packmind/commands-index.md`, context.testDir).split(
                  '\n',
                ),
              ).toEqual(
                expect.arrayContaining([
                  expect.stringContaining(
                    `[${publicCommand.name}](commands/${publicCommand.slug}.md)`,
                  ),
                ]),
              );
            });

            it('removes references to removed artefacts in packmind-lock.json', () => {
              const packmindLock = JSON.parse(
                readFile(`packmind-lock.json`, context.testDir),
              );

              expect(packmindLock).toMatchObject({
                artifacts: {
                  [`command:${publicCommand.slug}`]: expect.objectContaining({
                    id: publicCommand.id,
                    name: publicCommand.name,
                  }),
                },
              });
            });

            it('notifies Packmind that the private command is no longer deployed', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: privateSpace.id,
                  },
                );

              const allPackages = overview.flatMap((entry) => entry.packages);
              expect(
                allPackages.find((pkg) => pkg.packageId === privatePackage.id),
              ).toBeUndefined();
            });

            it('notifies Packmind that the public command is still deployed', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: publicSpace.id,
                  },
                );

              expect(overview).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    packages: expect.arrayContaining([
                      expect.objectContaining({
                        packageId: publicPackage.id,
                        deployedRecipes: expect.arrayContaining([
                          expect.objectContaining({
                            recipe: expect.objectContaining({
                              id: publicCommand.id,
                            }),
                            isUpToDate: true,
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              );
            });
          });

          describe('when installing without access to all packages ', () => {
            beforeEach(async () => {
              await context.runCli('install', {
                apiKey: context.extraUserApiKey,
              });
            });

            it('removes the files from the removed package', () => {
              expect(
                fileExists(
                  `.packmind/commands/${privateCommand.slug}.md`,
                  context.testDir,
                ),
              ).toEqual(false);
            });

            it('removes the references to the removed artefacts in the indices', () => {
              expect(
                readFile(`.packmind/commands-index.md`, context.testDir).split(
                  '\n',
                ),
              ).toEqual(
                expect.arrayContaining([
                  expect.stringContaining(
                    `[${publicCommand.name}](commands/${publicCommand.slug}.md)`,
                  ),
                ]),
              );
            });

            it('removes references to removed artefacts in packmind-lock.json', () => {
              const packmindLock = JSON.parse(
                readFile(`packmind-lock.json`, context.testDir),
              );

              expect(packmindLock).toMatchObject({
                artifacts: {
                  [`command:${publicCommand.slug}`]: expect.objectContaining({
                    id: publicCommand.id,
                    name: publicCommand.name,
                  }),
                },
              });
            });

            it('notifies Packmind that the private command is no longer deployed', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: privateSpace.id,
                  },
                );

              const allPackages = overview.flatMap((entry) => entry.packages);
              expect(
                allPackages.find((pkg) => pkg.packageId === privatePackage.id),
              ).toBeUndefined();
            });

            it('notifies Packmind that the public command is still deployed', async () => {
              const overview =
                await context.gateway.deployments.listActiveDistributedPackagesBySpace(
                  {
                    spaceId: publicSpace.id,
                  },
                );

              expect(overview).toEqual(
                expect.arrayContaining([
                  expect.objectContaining({
                    packages: expect.arrayContaining([
                      expect.objectContaining({
                        packageId: publicPackage.id,
                        deployedRecipes: expect.arrayContaining([
                          expect.objectContaining({
                            recipe: expect.objectContaining({
                              id: publicCommand.id,
                            }),
                            isUpToDate: true,
                          }),
                        ]),
                      }),
                    ]),
                  }),
                ]),
              );
            });
          });
        });
      });

      describe('when a user tries to install packages from a space he does not belong to', () => {
        describe('when installing from an open space', () => {
          let installResult: RunCliResult;

          beforeEach(async () => {
            installResult = await context.runCli(
              `install @${publicSpace.slug}/${publicPackage.slug}`,
              { apiKey: context.extraUserApiKey },
            );
          });

          it('fails and tells the user how to join the space', async () => {
            expect(installResult).toEqual({
              returnCode: 1,
              stderr: expect.toMatchOutput(
                `install failed: You don't have access to space @public-space. It is a public space — you can join at: http://localhost:4201/org/${context.organization.slug}/spaces/${publicSpace.slug}/join`,
              ),
              stdout: expect.toMatchOutput('Nothing to install'),
            });
          });
        });

        describe('when installing from a private space', () => {
          let installResult: RunCliResult;

          beforeEach(async () => {
            installResult = await context.runCli(
              `install @${privateSpace.slug}/${privatePackage.slug}`,
              { apiKey: context.extraUserApiKey },
            );
          });

          it('fails', async () => {
            expect(installResult).toEqual({
              returnCode: 1,
              stderr: expect.toMatchOutput(
                `Package @${privateSpace.slug}/${privatePackage.slug} does not exist`,
              ),
              stdout: expect.toMatchOutput('Nothing to install'),
            });
          });
        });
      });
    },
  );
});
