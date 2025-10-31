import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BookService } from './services/book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateBookFromISBNDto } from './dto/create-book-from-isbn.dto';
import { SearchBookDto } from './dto/search-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import {
  BookResponseDto,
  SearchBooksResponseDto,
} from './dto/book-response.dto';
import { Public } from '../auth/decorators/public.decorator';

/**
 * BookController
 *
 * Handles book catalog management endpoints.
 *
 * Authentication:
 * - Most endpoints are public (book browsing)
 * - Create/Update/Delete require authentication
 *
 * Design Decision:
 * - Book creation is authenticated to prevent spam
 * - Search is public to allow browsing before signup
 */
@ApiTags('books')
@Controller()
export class BooksController {
  constructor(private readonly bookService: BookService) {}

  /**
   * Create a book manually
   *
   * POST /books
   */
  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a book manually' })
  @ApiResponse({
    status: 201,
    description: 'Book created successfully',
    type: BookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(@Body() createBookDto: CreateBookDto): Promise<BookResponseDto> {
    const book = await this.bookService.create(createBookDto);
    return book as BookResponseDto;
  }

  /**
   * Create a book from ISBN (with automatic metadata fetch)
   *
   * POST /books/isbn
   */
  @Post('isbn')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create book from ISBN',
    description:
      'Automatically fetches book metadata from Google Books and creates the book',
  })
  @ApiResponse({
    status: 201,
    description: 'Book created from ISBN',
    type: BookResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No book found for this ISBN',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ISBN format',
  })
  async createFromISBN(
    @Body() createBookFromISBNDto: CreateBookFromISBNDto,
  ): Promise<BookResponseDto> {
    const book = await this.bookService.createFromISBN(
      createBookFromISBNDto.isbn,
    );
    return book as BookResponseDto;
  }

  /**
   * Get popular books (most listed)
   *
   * GET /books/popular
   */
  @Get('popular')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get popular books',
    description: 'Returns books ordered by number of listings (most popular first)',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of books to return',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Popular books retrieved successfully',
    type: [BookResponseDto],
  })
  async getPopular(@Query('limit') limit?: number): Promise<BookResponseDto[]> {
    const books = await this.bookService.getPopular(
      limit ? parseInt(limit.toString(), 10) : 10,
    );
    return books as BookResponseDto[];
  }

  /**
   * Get book by ID
   *
   * GET /books/:id
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get book by ID' })
  @ApiResponse({
    status: 200,
    description: 'Book retrieved successfully',
    type: BookResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Book not found',
  })
  async findById(@Param('id') id: string): Promise<BookResponseDto> {
    const book = await this.bookService.findById(id);
    return book as BookResponseDto;
  }

  /**
   * Search books using PostgreSQL FTS
   *
   * GET /books/search
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search books',
    description: 'Full-text search across title, author, and description',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: SearchBooksResponseDto,
  })
  async search(
    @Query() searchBookDto: SearchBookDto,
  ): Promise<SearchBooksResponseDto> {
    const { books, total } = await this.bookService.search(
      searchBookDto.query,
      {
        limit: searchBookDto.limit,
        offset: searchBookDto.offset,
        genre: searchBookDto.genre,
        language: searchBookDto.language,
      },
    );

    return {
      books: books as BookResponseDto[],
      total,
      limit: searchBookDto.limit || 20,
      offset: searchBookDto.offset || 0,
    };
  }

  /**
   * Search Google Books API
   *
   * GET /books/external/google
   */
  @Get('external/google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search Google Books API',
    description:
      'Search for books in Google Books (not in local catalog)',
  })
  @ApiQuery({
    name: 'query',
    description: 'Search query',
    example: 'odyssey homer',
  })
  @ApiQuery({
    name: 'maxResults',
    description: 'Maximum number of results',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Google Books search results',
  })
  async searchGoogleBooks(
    @Query('query') query: string,
    @Query('maxResults') maxResults?: number,
  ): Promise<any[]> {
    return this.bookService.searchGoogleBooks(
      query,
      maxResults ? parseInt(maxResults.toString(), 10) : 10,
    );
  }

  /**
   * Update book
   *
   * PATCH /books/:id
   */
  @Patch(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update book' })
  @ApiResponse({
    status: 200,
    description: 'Book updated successfully',
    type: BookResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Book not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<BookResponseDto> {
    const book = await this.bookService.update(id, updateBookDto);
    return book as BookResponseDto;
  }

  /**
   * Upload book cover image
   *
   * POST /books/:id/cover
   */
  @Post(':id/cover')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload book cover image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Cover image file (JPG, PNG, WebP)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cover image uploaded successfully',
    type: BookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or size',
  })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 3 * 1024 * 1024 }), // 3MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: any,
  ): Promise<BookResponseDto> {
    const book = await this.bookService.uploadCoverImage(id, file.buffer);
    return book as BookResponseDto;
  }

  /**
   * Delete book
   *
   * DELETE /books/:id
   */
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete book' })
  @ApiResponse({
    status: 200,
    description: 'Book deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Book not found',
  })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.bookService.delete(id);
    return { message: 'Book deleted successfully' };
  }

  /**
   * Get all genres
   *
   * GET /books/metadata/genres
   */
  @Get('metadata/genres')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all unique genres' })
  @ApiResponse({
    status: 200,
    description: 'List of genres',
    schema: {
      type: 'object',
      properties: {
        genres: {
          type: 'array',
          items: { type: 'string' },
          example: ['Fiction', 'Non-Fiction', 'Poetry'],
        },
      },
    },
  })
  async getGenres(): Promise<{ genres: string[] }> {
    const genres = await this.bookService.getAllGenres();
    return { genres };
  }

  /**
   * Get all languages
   *
   * GET /books/metadata/languages
   */
  @Get('metadata/languages')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all unique languages' })
  @ApiResponse({
    status: 200,
    description: 'List of languages',
    schema: {
      type: 'object',
      properties: {
        languages: {
          type: 'array',
          items: { type: 'string' },
          example: ['English', 'French', 'Spanish'],
        },
      },
    },
  })
  async getLanguages(): Promise<{ languages: string[] }> {
    const languages = await this.bookService.getAllLanguages();
    return { languages };
  }
}
