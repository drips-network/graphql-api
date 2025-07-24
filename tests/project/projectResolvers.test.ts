import { describe, test, beforeEach, expect, vi } from 'vitest';
import { SupportedChain } from '../../src/generated/graphql';
import ProjectsDataSource from '../../src/dataLoaders/ProjectsDataSource';
import projectResolvers from '../../src/project/projectResolvers';

vi.mock('../../src/project/projectUtils');

describe('dripListResolvers', () => {
  let dataSource: ProjectsDataSource;

  beforeEach(() => {
    vi.clearAllMocks();

    dataSource = new ProjectsDataSource();
    dataSource.getProjectsByFilter = vi.fn();
  });

  describe('projects', () => {
    test('should pass the limit parameter', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        limit: 75,
      };

      await projectResolvers.Query.projects(undefined, args, {
        dataSources: {
          projectsDataSource: dataSource,
        } as any,
      });

      expect(dataSource.getProjectsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        undefined,
        undefined,
        args.limit,
      );
    });

    test('passes undefined limit when not provided', async () => {
      const args = {
        chains: [SupportedChain.MAINNET],
        limit: undefined,
      };

      await projectResolvers.Query.projects(undefined, args, {
        dataSources: {
          projectsDataSource: dataSource,
        } as any,
      });

      expect(dataSource.getProjectsByFilter).toHaveBeenCalledWith(
        ['mainnet'],
        undefined,
        undefined,
        args.limit,
      );
    });
  });
});
