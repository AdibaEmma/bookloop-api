import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 13, nullable: true })
  isbn: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  author: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cover_image: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  publisher: string;

  @Column({ type: 'int', nullable: true })
  publication_year: number;

  @Column({ type: 'varchar', length: 50, default: 'English' })
  language: string;

  @Column({ type: 'int', nullable: true })
  pages: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  genre: string;

  @Column({ type: 'simple-array', nullable: true })
  categories: string[];

  // Google Books API ID (for metadata enrichment)
  @Column({ type: 'varchar', length: 50, nullable: true })
  google_books_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
