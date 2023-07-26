import { connection } from "../../app";
import { logger } from "../../utils/winston";
import { PrismaClient } from "@prisma/client";
import {
  UserDto,
  UserRegisterDto,
  VerifyEmailDto,
  UserLoginDto,
  VerifyVetDto,
} from "../dtos/userDto";
import bcrypt from "bcrypt";
import { sendEmail } from "../../utils/mail";
const prisma = new PrismaClient();

class UserService {
  static async addUser(userRegisterDto: UserRegisterDto) {
    try {
      const hashedPassword = await bcrypt.hash(userRegisterDto.password, 10);

      const createUser = await prisma.users.create({
        data: {
          email: userRegisterDto.email,
          password: hashedPassword,
          nickname: userRegisterDto.nickname,
          role: "user",
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      return createUser;
    } catch (err) {
      throw err;
    }
  }

  static async createVerificationCode(email: string) {
    const existingUser = await prisma.users.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return null;
    }

    const verificationCode = sendEmail(email);

    const verification = await prisma.verificationCodes.create({
      data: {
        email: email,
        code: verificationCode,
      },
    });
    return verification;
  }

  static async verifyUserEmail(verifyEmailDto: VerifyEmailDto) {
    try {
      // 사용자 이메일과 인증 코드를 사용하여 인증 확인
      const verificationCode = await prisma.verificationCodes.findFirst({
        where: { email: verifyEmailDto.email },
        orderBy: { createdAt: "desc" },
      });

      if (!verificationCode || verificationCode.code !== verifyEmailDto.code) {
        throw new Error("인증 코드가 유효하지 않습니다.");
      }

      await prisma.verificationCodes.deleteMany({
        where: { email: verifyEmailDto.email },
      });

      return;
    } catch (err) {
      throw err;
    }
  }

  static async loginUser(userLoginDto: UserLoginDto) {
    try {
      const user = await prisma.users.findUnique({
        where: { email: userLoginDto.email },
      });

      if (!user) {
        throw new Error("해당 이메일은 가입 내역이 없습니다.");
      }

      const passwordMatch = await bcrypt.compare(
        userLoginDto.password,
        user.password
      );

      if (!passwordMatch) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      return user;
    } catch (err) {
      throw err;
    }
  }

  static async addVet(
    verifyVetDto: VerifyVetDto,
    file_path: string,
    userEmail: string
  ) {
    try {
      const createVet = await prisma.vets.create({
        data: {
          user_email: userEmail,
          name: verifyVetDto.name,
          hospital_name: verifyVetDto.hospitalName,
          description: verifyVetDto.description,
          region: verifyVetDto.region,
          img_path: file_path,
        },
      });
      return createVet;
    } catch (Error) {
      throw Error;
    }
  }

  static async getUser(email: string) {
    try {
      const user = await prisma.users.findUnique({
        where: { email },
      });

      const vet = await prisma.vets.findFirst({
        where: { user_email: email },
      });

      return { user, vet };
    } catch (err) {
      throw err;
    }
  }

  static async setUser(email: string, updatedFields: Partial<UserDto>) {
    try {
      const user = await prisma.users.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error("유저 정보가 없습니다.");
      }

      if (updatedFields.password) {
        const hashedPassword = await bcrypt.hash(updatedFields.password, 10);
        user.password = hashedPassword;
      }
      if (updatedFields.nickname) user.nickname = updatedFields.nickname;
      if (updatedFields.img_path) user.img_path = updatedFields.img_path;

      const updateUser = await prisma.users.update({
        where: {
          email,
        },
        data: user,
      });

      return updateUser;
    } catch (Error) {
      throw Error;
    }
  }
}

export { UserService };
