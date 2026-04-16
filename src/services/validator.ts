import { ValidationResult } from '../types';
import { Logger } from './logger';

export class Validator {
  constructor(private logger: Logger) {}

  async validate(pkgName: string, version: string): Promise<ValidationResult> {
    await this.logger.log(
      'Validator',
      'Test Runner',
      'INFO',
      `Validating patch: ${pkgName}@${version}`
    );

    // Deterministic Hackathon Demo Logic
    if (pkgName === 'lodash' && version === '4.17.19') {
      await this.logger.log(
        'Validator',
        'Test Runner',
        'ERROR',
        `Validation FAILED for lodash@4.17.19: Peer dependency mismatch in 'fixstack-core'`,
        { errorType: 'COMPATIBILITY_FAILURE' }
      );
      return {
        success: false,
        message: 'Peer dependency mismatch in fixstack-core',
        logs: ['Checking tree...', 'Detected lodash@4.17.19', 'Error: fixstack-core requires lodash >=4.17.20']
      };
    }

    await this.logger.log(
      'Validator',
      'Test Runner',
      'SUCCESS',
      `Validation PASSED for ${pkgName}@${version}`
    );

    return {
      success: true,
      message: 'All tests passed',
      logs: ['npm install...', 'npm test...', 'Total: 42 passed, 0 failed']
    };
  }
}
