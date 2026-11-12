import {
  Controller,
  Get,
} from '@nestjs/common';

@Controller('job-postings-placeholder')
export class JobPostingsController {
  @Get()
  findAll() {
    return [];
  }
}
