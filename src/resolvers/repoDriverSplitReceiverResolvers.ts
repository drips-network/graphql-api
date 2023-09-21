// import GitProjectModel from '../git-project/GitProjectModel';

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
//           model: GitProjectModel,
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
//       return GitProjectModel.findByPk(parent.funderProjectId);
//     },
//   },
// };

// export default repoDriverSplitReceiverResolvers;
