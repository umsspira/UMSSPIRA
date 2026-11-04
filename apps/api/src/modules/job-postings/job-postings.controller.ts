
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  NotFoundException,
  Query,
} from '@nestjs/common';

import { JobPostingsService } from './job-postings.service';
import { JobPostingsSearchService } from './search/job-postings-search.service';
import { CreateJobPostingDto } from './dto/create-job-posting.dto';

@Controller('vacantes')
export class JobPostingsController {
  constructor(
    private readonly jobPostingsService: JobPostingsService,
    private readonly jobPostingsSearchService: JobPostingsSearchService,
  ) {}

  @Get()
  findAll() {
    return this.jobPostingsService.findAll();
  }

  @Get('activas')
  findActive(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.jobPostingsSearchService.findActive({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const jobPosting = this.jobPostingsService.findOne(id);

    if (!jobPosting) {
      throw new NotFoundException('Vacante no encontrada');
    }

    return jobPosting;
  }

  @Post()
  create(@Body() data: CreateJobPostingDto) {
    return this.jobPostingsService.create(data);
  }
}
