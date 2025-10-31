import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetupSpotsController } from './meetup-spots.controller';
import { MeetupSpotsService } from './meetup-spots.service';
import { MeetupSpot } from './entities/meetup-spot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MeetupSpot])],
  controllers: [MeetupSpotsController],
  providers: [MeetupSpotsService],
  exports: [MeetupSpotsService],
})
export class MeetupSpotsModule {}
