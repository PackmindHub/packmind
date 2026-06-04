import { Crisp } from 'crisp-api';
import { maskEmail, PackmindLogger } from '@packmind/logger';
import { Configuration } from '@packmind/node-utils';
import { isTrialEmail } from './utils/email.utils';

const origin = 'CrispTrackEventService';

function describeCrispError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    return JSON.stringify(error);
  }
  return String(error);
}

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
    this.logger.info('[Crisp API] Starting initialization...');
    const pluginIdentifier = await Configuration.getConfig(
      'CRISP_PLUGIN_IDENTIFIER',
    );
    const apiKey = await Configuration.getConfig('CRISP_API_KEY');
    const webSiteId = await Configuration.getConfig('CRISP_WEBSITE_ID');
    if (!pluginIdentifier?.length || !apiKey?.length || !webSiteId?.length) {
      this.logger.info(
        '[Crisp API] Initialization skipped - missing configuration (CRISP_PLUGIN_IDENTIFIER, CRISP_API_KEY, or CRISP_WEBSITE_ID)',
      );
      return;
    }
    this.webSite = webSiteId;
    this.logger.info(
      `[Crisp API] Before authenticateTier for websiteId=${webSiteId}`,
    );
    this.crispClient.authenticateTier('plugin', pluginIdentifier, apiKey);
    this.logger.info(
      `[Crisp API] After authenticateTier - authentication configured successfully`,
    );
    this.initialized = true;
    this.logger.info('[Crisp API] Initialization complete');
  }

  async createPeopleIfNotAlreadyExists(email: string) {
    // Early return for trial emails
    if (isTrialEmail(email)) {
      this.logger.info(
        `[Crisp API] Skipping profile creation for trial email ${maskEmail(email)}`,
      );
      return;
    }

    if (!this.configurationChecked) {
      await this.initializeCrisp();
    }

    if (!this.initialized) {
      return;
    }

    this.logger.info(
      `[Crisp API] Before checkPeopleProfileExists for ${maskEmail(email)}`,
    );
    try {
      try {
        await this.crispClient.website.checkPeopleProfileExists(
          this.webSite,
          email,
        );
        this.logger.info(
          `[Crisp API] After checkPeopleProfileExists for ${maskEmail(email)} - profile exists`,
        );
        return;
      } catch (error: unknown) {
        const isNotFound =
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 404;
        if (!isNotFound) {
          throw error;
        }
      }

      const peopleProfile = {
        email,
        person: {
          nickname: email,
        },
      };
      this.logger.info(
        `[Crisp API] Before addNewPeopleProfile for ${maskEmail(email)}`,
      );
      await this.crispClient.website.addNewPeopleProfile(
        this.webSite,
        peopleProfile,
      );
      this.logger.info(
        `[Crisp API] After addNewPeopleProfile for ${maskEmail(email)} - success`,
      );
    } catch (error) {
      this.logger.error(
        `[Crisp API] createPeopleIfNotAlreadyExists for ${maskEmail(email)} failed: ${describeCrispError(error)}`,
      );
    }
  }

  async addPeopleEvent(email: string, eventName: string) {
    // Early return for trial emails
    if (isTrialEmail(email)) {
      this.logger.info(
        `[Crisp API] Skipping event '${eventName}' for trial email ${maskEmail(email)}`,
      );
      return;
    }

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
      this.logger.info(
        `[Crisp API] Before addPeopleEvent '${eventName}' for ${maskEmail(email)}`,
      );
      await this.crispClient.website.addPeopleEvent(
        this.webSite,
        email,
        peopleEvent,
      );
      this.logger.info(
        `[Crisp API] After addPeopleEvent '${eventName}' for ${maskEmail(email)} - success`,
      );
    } catch (error) {
      this.logger.error(
        `[Crisp API] addPeopleEvent '${eventName}' for ${maskEmail(email)} failed: ${describeCrispError(error)}`,
      );
    }
  }
}
