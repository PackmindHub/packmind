import {
  displayNamesById,
  historyAuthor,
  historyEntries,
} from './componentHistory';

const OLDER = '2026-06-01T10:00:00.000Z';
const NEWER = '2026-09-01T10:00:00.000Z';

function version(overrides: Partial<Parameters<typeof historyEntries>[0][0]>) {
  return { id: 'v', version: 1, ...overrides };
}

describe('historyEntries', () => {
  describe('ordering', () => {
    it('puts the newest version first', () => {
      expect(
        historyEntries([
          version({ id: 'a', version: 1 }),
          version({ id: 'c', version: 3 }),
          version({ id: 'b', version: 2 }),
        ]).map((entry) => entry.version),
      ).toEqual([3, 2, 1]);
    });

    it('leaves the payload it was handed alone', () => {
      const payload = [
        version({ id: 'a', version: 1 }),
        version({ id: 'b', version: 2 }),
      ];
      historyEntries(payload);

      expect(payload.map((entry) => entry.version)).toEqual([1, 2]);
    });

    /* Should not happen, and must not reorder on every render if it does. */
    it('breaks a tie on the number with the date', () => {
      expect(
        historyEntries([
          version({ id: 'a', version: 2, createdAt: OLDER }),
          version({ id: 'b', version: 2, createdAt: NEWER }),
        ]).map((entry) => entry.key),
      ).toEqual(['b', 'a']);
    });
  });

  describe('the one-version case', () => {
    it('is a list of one and not an absence', () => {
      expect(historyEntries([version({ id: 'a', version: 1 })])).toHaveLength(
        1,
      );
    });
  });

  describe('while the query is in flight', () => {
    it('reports no rows', () => {
      expect(historyEntries(undefined)).toEqual([]);
    });
  });

  describe('the date', () => {
    it('is read off the payload the version type does not declare', () => {
      expect(historyEntries([version({ createdAt: NEWER })])[0].createdAt).toBe(
        NEWER,
      );
    });

    describe('when the payload sent none', () => {
      it('is nothing', () => {
        expect(historyEntries([version({})])[0].createdAt).toBeNull();
      });
    });

    describe('when the payload cannot be read', () => {
      it('is nothing', () => {
        expect(
          historyEntries([version({ createdAt: 'not a date' })])[0].createdAt,
        ).toBeNull();
      });
    });
  });

  describe('when a version came out of a commit', () => {
    const withCommit = [
      version({
        gitCommit: {
          sha: '4f2a9c1d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39',
          message: 'Packmind: distribute Scratch package\n\nlonger body',
          author: 'joan.racenet',
          url: 'https://github.com/acme/repo/commit/4f2a9c1',
        },
      }),
    ];

    it('reads the sha short, the way one is read', () => {
      expect(historyEntries(withCommit)[0].commit?.shortSha).toBe('4f2a9c1');
    });

    it('keeps the whole sha as well', () => {
      expect(historyEntries(withCommit)[0].commit?.sha).toHaveLength(40);
    });

    it('takes the subject and leaves the body behind', () => {
      expect(historyEntries(withCommit)[0].commit?.subject).toBe(
        'Packmind: distribute Scratch package',
      );
    });

    it('names the author', () => {
      expect(historyEntries(withCommit)[0].commit?.author).toBe('joan.racenet');
    });

    it('keeps the link to follow', () => {
      expect(historyEntries(withCommit)[0].commit?.url).toBe(
        'https://github.com/acme/repo/commit/4f2a9c1',
      );
    });
  });

  describe('when a version did not come out of a commit', () => {
    it('says nothing about where it came from', () => {
      expect(historyEntries([version({})])[0].commit).toBeNull();
    });

    /*
     * A skill's versions have no `gitCommit` field at all, so this is every row
     * of every skill's history.
     */
    it('says nothing for a null commit either', () => {
      expect(
        historyEntries([version({ gitCommit: null })])[0].commit,
      ).toBeNull();
    });
  });

  describe('when a commit carries no link', () => {
    it('reports the commit without one rather than dropping it', () => {
      expect(
        historyEntries([
          version({
            gitCommit: {
              sha: 'abc1234',
              message: 'Fix',
              author: 'someone',
              url: '',
            },
          }),
        ])[0].commit?.url,
      ).toBeNull();
    });
  });
});

describe('the rename a version carries', () => {
  describe('when the name changed in this version', () => {
    it('reports the name it had before', () => {
      expect(
        historyEntries([
          version({ id: 'b', version: 2, name: 'PHP Best Practices' }),
          version({ id: 'a', version: 1, name: 'PHP standards' }),
        ])[0].renamedFrom,
      ).toBe('PHP standards');
    });
  });

  describe('when the name did not change', () => {
    it('reports nothing', () => {
      expect(
        historyEntries([
          version({ id: 'b', version: 2, name: 'Same' }),
          version({ id: 'a', version: 1, name: 'Same' }),
        ])[0].renamedFrom,
      ).toBeNull();
    });
  });

  /* Being created with the name it has is not a rename. */
  describe('the oldest version', () => {
    it('never claims a rename, having nothing before it', () => {
      const entries = historyEntries([
        version({ id: 'b', version: 2, name: 'New' }),
        version({ id: 'a', version: 1, name: 'Old' }),
      ]);

      expect(entries[entries.length - 1].renamedFrom).toBeNull();
    });
  });

  describe('when the payload carries no name', () => {
    it('reports nothing rather than a rename from nothing', () => {
      expect(
        historyEntries([
          version({ id: 'b', version: 2 }),
          version({ id: 'a', version: 1, name: 'Old' }),
        ])[0].renamedFrom,
      ).toBeNull();
    });
  });
});

describe('historyAuthor', () => {
  const names = new Map([['user-1', 'Joan Racenet']]);

  describe('when the version came out of a commit', () => {
    it("names the commit's author, who is who made the change", () => {
      const [entry] = historyEntries([
        version({
          userId: 'user-1',
          gitCommit: {
            sha: 'abc1234',
            message: 'Fix',
            author: 'someone-else',
            url: '',
          },
        }),
      ]);

      expect(historyAuthor(entry, names)).toBe('someone-else');
    });
  });

  describe('when the version carries only a user id', () => {
    it('reads it as a name', () => {
      const [entry] = historyEntries([version({ userId: 'user-1' })]);

      expect(historyAuthor(entry, names)).toBe('Joan Racenet');
    });

    it('reports nothing for an id no longer in the organisation', () => {
      const [entry] = historyEntries([version({ userId: 'user-9' })]);

      expect(historyAuthor(entry, names)).toBeNull();
    });
  });

  describe('when the version says neither', () => {
    it('reports nothing', () => {
      const [entry] = historyEntries([version({})]);

      expect(historyAuthor(entry, names)).toBeNull();
    });
  });
});

describe('displayNamesById', () => {
  it('reads the members by id', () => {
    expect(
      displayNamesById([{ userId: 'user-1', displayName: 'Joan' }]).get(
        'user-1',
      ),
    ).toBe('Joan');
  });

  describe('while the members are still being fetched', () => {
    it('answers nothing rather than nobody', () => {
      expect(displayNamesById(undefined).size).toBe(0);
    });
  });
});
