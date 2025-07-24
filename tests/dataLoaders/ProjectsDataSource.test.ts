import { describe, test, beforeEach, expect, vi } from 'vitest';
import ProjectsDataSource from '../../src/dataLoaders/ProjectsDataSource';

vi.mock('../../src/dataLoaders/sqlQueries/projectsQueries');
vi.mock('../../src/project/projectUtils', () => ({
  toApiProject: vi.fn().mockResolvedValue(null),
}));

describe('ProjectsDataSource', () => {
  let dataSource: ProjectsDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    dataSource = new ProjectsDataSource();
    dataSource.getProjectsByFilter = vi.fn();
  });

  test('passes limit parameter to SQL queries', async () => {
    await dataSource.getProjectsByFilter(['mainnet'], {}, undefined, 25);

    expect(dataSource.getProjectsByFilter).toHaveBeenCalledWith(
      ['mainnet'],
      {},
      undefined,
      25,
    );
  });

  test('passes undefined limit to SQL queries', async () => {
    await dataSource.getProjectsByFilter(['mainnet'], {}, undefined, undefined);

    expect(dataSource.getProjectsByFilter).toHaveBeenCalledWith(
      ['mainnet'],
      {},
      undefined,
      undefined,
    );
  });
});
