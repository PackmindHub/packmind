export type HelpMessage = {
  content: string;
  exampleCommand?: string;
  command?: string;
};

export type Artefact = {
  title: string;
  slug: string;
  description?: string;
  url?: string | null;
};

export interface IOutput {
  notifySuccess(message: string, help?: HelpMessage): void;

  notifyInfo(message: string, help?: HelpMessage): void;

  notifyWarning(message: string, help?: HelpMessage): void;

  notifyError(message: string, help?: HelpMessage): void;

  showLoader(message: string): void;

  withLoader<T>(message: string, loader: () => Promise<T>): Promise<T>;

  showArtefact(artefact: Artefact, help?: HelpMessage): void;

  listArtefacts(title: string, artefacts: Artefact[], help?: HelpMessage): void;

  listScopedArtefacts(
    title: string,
    scopedArtefacts: { title: string; artefacts: Artefact[] }[],
    help?: HelpMessage,
  ): void;
}
