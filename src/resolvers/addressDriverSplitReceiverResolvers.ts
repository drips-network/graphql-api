// import { ProjectModel, AddressDriverSplitReceiverModel } from '../models';

// const addressDriverSplitReceiverResolvers = {
//   Query: {
//     async addressDriverSplitReceiverByFunderAccountId(
//       _: any,
//       args: { accountId: string },
//     ) {

//       return AddressDriverSplitReceiverModel.findAll({
//         where: {
//           funderProjectId: args.projectId,
//         },
//         include: {
//           model: ProjectModel,
//           as: 'fundeeProject',
//         },
//       });
//     },
//   },
//   AddressDriverSplitReceiver: {
//     async fundeeProject(parent: { funderProjectId: any }) {
//       return ProjectModel.findByPk(parent.funderProjectId);
//     },
//   },
// };

// export default addressDriverSplitReceiverResolvers;
