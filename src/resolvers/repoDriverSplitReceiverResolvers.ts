// import ProjectModel from '../git-project/ProjectModel';

// const repoDriverSplitReceiverResolvers = {
//   Query: {
//     async repoDriverSplitReceiverByFunderProjectId(
//       _: any,
//       args: { projectId: string },
//     ) {
//       const r = await RepoDriverSplitReceiverModel.findAll({
//         where: {
//           funderProjectId: args.projectId,
//         },
//         include: {
//           model: ProjectModel,
//           as: 'fundeeProject',
//         },
//       });
//       return {
//         ...r,
//         fundeeType: 'Project',
//       };
//     },
//   },
//   RepoDriverSplitReceiver: {
//     async fundeeProject(parent: { funderProjectId: any }) {
//       return ProjectModel.findByPk(parent.funderProjectId);
//     },
//   },
// };

// export default repoDriverSplitReceiverResolvers;
