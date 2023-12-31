import { IsString, Length, IsEnum, IsInt, IsIn } from "class-validator";

enum Category {
  FREE = "free",
  INFO = "info",
}

class CreatePostDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsString()
  @Length(1, 1000)
  body: string;

  @IsEnum(Category)
  category: Category;

  constructor(title: string, body: string, category: Category) {
    this.title = title;
    this.body = body;
    this.category = category;
  }
}

class UpdatePostDto {
  @IsString()
  @Length(1, 255)
  title: string;

  @IsString()
  @Length(1, 1000)
  body: string;

  constructor(title: string, body: string) {
    this.title = title;
    this.body = body;
  }
}

enum ReportReason {
  PROMOTION_OR_COMMERCIAL_CONTENT = "홍보/상업성",
  SPAM = "스팸",
  PROFANITY_OR_HARASSMENT = "욕설/인신공격",
  ADULT_CONTENT_OR_EXPLICITMATERIAL = "음란/선정성",
  ILLEGAL_INFORMATION = "불법정보",
  PERSONAL_INFORMATION_EXPOSURE = "개인정보 노출",
}

class ReportPostDto {
  @IsInt()
  post_id: number;

  @IsString()
  @IsIn(Object.values(ReportReason))
  reason: string;

  constructor(post_id: number, reason: string) {
    this.post_id = post_id;
    this.reason = reason;
  }
}

export { CreatePostDto, UpdatePostDto, ReportPostDto, Category };
