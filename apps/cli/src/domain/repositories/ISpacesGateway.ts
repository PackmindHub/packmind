// Global space type (used by createCommand and createStandard)
export type GetGlobalSpaceResult = {
  id: string;
  slug: string;
};

export interface ISpacesGateway {
  getGlobal(): Promise<GetGlobalSpaceResult>;
}
