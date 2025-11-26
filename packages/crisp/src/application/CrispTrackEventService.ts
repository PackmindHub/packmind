import { Crisp } from 'crisp-api';
import { maskEmail, PackmindLogger } from '@packmind/logger';
import { Configuration, getErrorMessage } from '@packmind/node-utils';

const origin = 'CrispTrackEventService';

export class CrispTrackEventService {
  private initialized = false;
  private configurationChecked = false;
  private crispClient: Crisp = new Crisp();
  private webSite = '';

  constructor(private readonly logger = new PackmindLogger(origin)) {
    this.logger.info(`${origin} (proprietary) initialized`);
  }

  private async initializeCrisp() {
    this.configurationChecked = true;
    const pluginIdentifier = await Configuration.getConfig(
      'CRISP_PLUGIN_IDENTIFIER',
    );
    const apiKey = await Configuration.getConfig('CRISP_API_KEY');
    const webSiteId = await Configuration.getConfig('CRISP_WEBSITE_ID');
    if (!pluginIdentifier?.length || !apiKey?.length || !webSiteId?.length) {
      this.logger.debug(
        'No Configuration for Crisp, missing CRISP_PLUGIN_IDENTIFIER or CRISP_API_KEY or CRISP_WEBSITE_ID, skip',
      );
      return;
    }
    this.webSite = webSiteId;
    this.crispClient.authenticateTier('plugin', pluginIdentifier, apiKey);
    this.logger.info('CrispTrackEventService initialized');
    this.initialized = true;
  }

  async createPeopleIfNotAlreadyExists(email: string) {
    if (!this.configurationChecked) {
      await this.initializeCrisp();
    }

    if (!this.initialized) {
      return;
    }

    this.logger.info(`Create People if not already exists ${maskEmail(email)}`);
    try {
      await this.crispClient.website.checkPeopleProfileExists(
        this.webSite,
        email,
      );
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 404
      ) {
        this.logger.info(`Add new user to Crisp ${maskEmail(email)}`);
        const peopleProfile = {
          email,
          person: {
            nickname: email,
          },
        };
        this.logger.info(`Add People Profile ${maskEmail(email)}`);
        await this.crispClient.website.addNewPeopleProfile(
          this.webSite,
          peopleProfile,
        );
      }
    }
  }

  async addPeopleEvent(email: string, eventName: string) {
    if (!this.configurationChecked) {
      await this.initializeCrisp();
    }

    if (!this.initialized) {
      return;
    }

    try {
      await this.createPeopleIfNotAlreadyExists(email);
      const peopleEvent = {
        text: eventName,
      };
      await this.crispClient.website.addPeopleEvent(
        this.webSite,
        email,
        peopleEvent,
      );
    } catch (error) {
      this.logger.error(getErrorMessage(error));
    }
  }
}
