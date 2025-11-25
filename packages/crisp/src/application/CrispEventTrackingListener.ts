import { PackmindLogger } from '@packmind/logger';
import { CrispTrackEventService } from './CrispTrackEventService';

const origin = 'CrispEventTrackingListener';

export class CrispEventTrackingListener {
  private readonly crispService: CrispTrackEventService;

  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.crispService = new CrispTrackEventService(this.logger);
    this.logger.info(
      'CrispEventTrackingListener (proprietary version) initialized',
    );
  }

  // TODO
  async listenEvent(): Promise<void> {
    this.logger.info('CrispEventTrackingListener.listenEvent called');
    // await this.crispService.addPeopleEvent(
    //   'user@acme.com',
    //   'test_packmind_crisp_event'
    // );
  }
}
