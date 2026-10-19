import { getEnvVar } from '../../shared/utils/getEnvVar';
import { isPackmindCloud } from '../../shared/utils/isPackmindCloud';
import { initCrisp, isCrispEnabled, openCrisp } from './CrispService';

vi.mock('../../shared/utils/getEnvVar', () => ({
  getEnvVar: vi.fn(),
}));
vi.mock('../../shared/utils/isPackmindCloud', () => ({
  isPackmindCloud: vi.fn(),
}));

const stubWebsiteId = (websiteId: string) =>
  vi
    .mocked(getEnvVar)
    .mockImplementation((name) =>
      name === 'VITE_CRISP_WEBSITE_ID' ? websiteId : '',
    );

type CrispWindow = Window & {
  $crisp?: unknown[];
  CRISP_WEBSITE_ID?: string;
};

const crispScripts = () =>
  document.head.querySelectorAll(
    'script[src="https://client.crisp.chat/l.js"]',
  );

describe('CrispService', () => {
  afterEach(() => {
    vi.mocked(getEnvVar).mockReset();
    vi.mocked(isPackmindCloud).mockReset();
    document.head.innerHTML = '';
    delete (window as CrispWindow).$crisp;
    delete (window as CrispWindow).CRISP_WEBSITE_ID;
  });

  describe('when running on Packmind Cloud with a website ID', () => {
    beforeEach(() => {
      stubWebsiteId('website-id');
      vi.mocked(isPackmindCloud).mockReturnValue(true);
    });

    it('is enabled', () => {
      expect(isCrispEnabled()).toBe(true);
    });

    it('loads the Crisp script once', () => {
      initCrisp();
      initCrisp();

      expect(crispScripts()).toHaveLength(1);
      expect((window as CrispWindow).CRISP_WEBSITE_ID).toBe('website-id');
    });
  });

  describe('when the website ID is not configured', () => {
    beforeEach(() => {
      stubWebsiteId('');
      vi.mocked(isPackmindCloud).mockReturnValue(true);
    });

    it('is disabled', () => {
      expect(isCrispEnabled()).toBe(false);
    });

    it('does not load the Crisp script', () => {
      initCrisp();
      initCrisp();

      expect(crispScripts()).toHaveLength(0);
    });
  });

  describe('when running outside Packmind Cloud', () => {
    beforeEach(() => {
      stubWebsiteId('website-id');
      vi.mocked(isPackmindCloud).mockReturnValue(false);
    });

    it('is disabled', () => {
      expect(isCrispEnabled()).toBe(false);
    });

    it('does not load the Crisp script', () => {
      initCrisp();

      expect(crispScripts()).toHaveLength(0);
    });

    it('does not open the chat', () => {
      openCrisp();

      expect((window as CrispWindow).$crisp).toBeUndefined();
    });
  });
});
