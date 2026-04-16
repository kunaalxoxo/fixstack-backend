import { DependencyInput } from '../types';
import { Logger } from './logger';

export class ScannerAgent {
  constructor(private logger: Logger) {}

  async scan(input: DependencyInput) {
    await this.logger.log(
      'Repo Scanner',
      'Manifest Parser',
      'INFO',
      `Scanning ${input.repoName} (${input.manifestType})`,
      { dependencyCount: input.dependencies.length }
    );

    // In a real app, this would read files. For the demo, we use the input.
    const found = input.dependencies;

    await this.logger.log(
      'Repo Scanner',
      'Manifest Parser',
      'SUCCESS',
      `Found ${found.length} dependencies in ${input.repoName}`
    );

    return found;
  }
}
