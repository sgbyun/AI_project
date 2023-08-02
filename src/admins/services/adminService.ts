import { PrismaClient, Prisma } from "@prisma/client";
import {
  UserListDto,
  UserStatusDto,
  VetListDto,
  VetStatusDto,
  ReportListDto,
} from "../dtos/adminDto";

const prisma = new PrismaClient();

class AdminService {
  static async getVetRequestLists(vetListsDto: VetListDto) {
    try {
      const vetRequests = await prisma.vets.findMany({
        where: {
          status: vetListsDto.status,
        },
        orderBy: {
          updated_at: "asc",
        },
      });
      return vetRequests;
    } catch (error) {
      throw error;
    }
  }

  static async manageVetRequests(vetStatusDto: VetStatusDto) {
    try {
      const updateVet = await prisma.vets.update({
        where: {
          id: vetStatusDto.id,
        },
        data: {
          status: vetStatusDto.status,
        },
      });
      if (updateVet.status == "accepted") {
        await prisma.users.update({
          where: {
            email: vetStatusDto.email,
          },
          data: {
            role: "vet",
          },
        });
      }
      return updateVet;
    } catch (error) {
      throw error;
    }
  }

  static async getUserList(
    userListDto: UserListDto,
    startIndex: number,
    rowPerPage: number
  ) {
    try {
      const where: Prisma.usersWhereInput = {};

      if (userListDto.role) {
        where["role"] = userListDto.role;
      } else if (userListDto.blocked === "false") {
        where["blocked_at"] = null;
      } else if (userListDto.blocked === "true") {
        where["blocked_at"] = { not: null };
      } else if (userListDto.deleted === "false") {
        where["deleted_at"] = null;
      } else if (userListDto.deleted === "true") {
        where["deleted_at"] = { not: null };
      }

      if (userListDto.search) {
        where["OR"] = [
          { email: { contains: userListDto.search } },
          { nickname: { contains: userListDto.search } },
        ];
      }

      const orderBy: Prisma.usersOrderByWithRelationInput = {
        created_at:
          userListDto.orderBy === "asc"
            ? Prisma.SortOrder.asc
            : Prisma.SortOrder.desc,
      };

      const users = await prisma.users.findMany({
        where,
        select: {
          email: true,
          nickname: true,
          role: true,
          img_path: true,
          created_at: true,
          blocked_at: true,
          deleted_at: true,
        },
        orderBy,
        skip: startIndex,
        take: rowPerPage,
      });

      return users;
    } catch (error) {
      throw error;
    }
  }

  static async getTotalUsersCnt(userListDto: UserListDto) {
    try {
      const where: Prisma.usersWhereInput = {};

      if (userListDto.role) {
        where.role = userListDto.role;
      } else if (userListDto.blocked === "false") {
        where.blocked_at = null;
      } else if (userListDto.blocked === "true") {
        where.blocked_at = { not: null };
      } else if (userListDto.deleted === "false") {
        where.deleted_at = null;
      } else if (userListDto.deleted === "true") {
        where.deleted_at = { not: null };
      }

      if (userListDto.search) {
        where["OR"] = [
          { email: { contains: userListDto.search } },
          { nickname: { contains: userListDto.search } },
        ];
      }

      const totalUsersCnt = await prisma.users.count({ where });

      return totalUsersCnt;
    } catch (error) {
      throw error;
    }
  }

  static async manageUsers(userStatusDto: UserStatusDto) {
    try {
      const { email, blocked, deleted } = userStatusDto;

      const user = await prisma.users.findUnique({ where: { email } });

      if (!user) {
        throw new Error("유저가 존재하지 않습니다.");
      }

      // 2주 정지
      if (blocked === "true") {
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

        if (!user.blocked_at) {
          await prisma.users.update({
            where: { email },
            data: { blocked_at: twoWeeksFromNow },
          });
        } else {
          const blockedAt = new Date(user.blocked_at);
          blockedAt.setDate(blockedAt.getDate() + 14);

          await prisma.users.update({
            where: { email },
            data: { blocked_at: blockedAt },
          });
        }
      }

      // 정지 해제
      if (blocked === "false") {
        await prisma.users.update({
          where: { email },
          data: { blocked_at: null },
        });
      }

      // 영구 정지
      if (blocked === "permanent") {
        await prisma.users.update({
          where: { email },
          data: { blocked_at: new Date("9999-12-31") },
        });
      }

      // 강제 탈퇴
      if (deleted === "true") {
        await prisma.users.update({
          where: { email },
          data: { deleted_at: new Date() },
        });
      }
    } catch (error) {
      throw error;
    }
  }

  static async getPostList(
    reportListDto: ReportListDto,
    currentPage: number,
    rowPerPage: number
  ) {
    try {
      const status = reportListDto.status;
      const startIndex = (currentPage - 1) * rowPerPage;

      let reportedPostList;
      let totalPostsCnt;

      const where: Prisma.report_postsWhereInput = status
        ? {
            reports: {
              status: {
                in:
                  status === "completed" ? ["accepted", "rejected"] : [status],
              },
            },
          }
        : {};

      const baseQuery = prisma.report_posts.findMany({
        where,
        select: {
          reports: {
            select: {
              content: true,
              status: true,
              created_at: true,
            },
          },
          posts: {
            select: {
              category: true,
              title: true,
              body: true,
              created_at: true,
              users: {
                select: {
                  email: true,
                  nickname: true,
                  img_path: true,
                  blocked_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
        orderBy: {
          reports: {
            updated_at: "asc",
          },
        },
        skip: startIndex,
        take: rowPerPage,
      });

      reportedPostList = await baseQuery;
      totalPostsCnt = await prisma.report_posts.count({
        where,
      });

      return { reportedPostList, totalPostsCnt };
    } catch (error) {
      throw error;
    }
  }

  static async getCommentList(
    reportListDto: ReportListDto,
    currentPage: number,
    rowPerPage: number
  ) {
    try {
      const status = reportListDto.status;
      const startIndex = (currentPage - 1) * rowPerPage;

      let reportedCommentList;
      let totalCommentsCnt;

      const where: Prisma.report_commentsWhereInput = status
        ? {
            reports: {
              status: {
                in:
                  status === "completed" ? ["accepted", "rejected"] : [status],
              },
            },
          }
        : {};

      const baseQuery = prisma.report_comments.findMany({
        where,
        select: {
          reports: {
            select: {
              content: true,
              status: true,
              created_at: true,
            },
          },
          comments: {
            select: {
              body: true,
              created_at: true,
              users: {
                select: {
                  email: true,
                  nickname: true,
                  img_path: true,
                  blocked_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
        orderBy: {
          reports: {
            updated_at: "asc",
          },
        },
        skip: startIndex,
        take: rowPerPage,
      });

      reportedCommentList = await baseQuery;
      totalCommentsCnt = await prisma.report_comments.count({
        where,
      });

      return { reportedCommentList, totalCommentsCnt };
    } catch (error) {
      throw error;
    }
  }
}

export { AdminService };
