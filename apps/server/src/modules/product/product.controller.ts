import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

import { ProductService } from './product.service';
import { QueryProductDto } from './dto';
import { Public } from '../../common/decorators';

@ApiTags('商品')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Public()
  @Get('list')
  @ApiOperation({ summary: '获取商品列表' })
  async getProductList(@Query() dto: QueryProductDto) {
    return this.productService.getProductList(dto);
  }

  @Public()
  @Get('detail/:id')
  @ApiOperation({ summary: '获取商品详情' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async getProductDetail(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getProductDetail(id);
  }

  @Public()
  @Get('hot')
  @ApiOperation({ summary: '获取热销商品' })
  @ApiQuery({ name: 'limit', required: false, description: '数量限制' })
  async getHotProducts(@Query('limit') limit?: string) {
    const num = limit ? parseInt(limit, 10) : 10;
    return this.productService.getHotProducts(num);
  }

  @Public()
  @Get('new')
  @ApiOperation({ summary: '获取新品推荐' })
  @ApiQuery({ name: 'limit', required: false, description: '数量限制' })
  async getNewProducts(@Query('limit') limit?: string) {
    const num = limit ? parseInt(limit, 10) : 10;
    return this.productService.getNewProducts(num);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: '搜索商品' })
  @ApiQuery({ name: 'keyword', description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  async searchProducts(
    @Query('keyword') keyword: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.productService.searchProducts(keyword, pageNum, pageSizeNum);
  }

  @Public()
  @Get('category')
  @ApiOperation({ summary: '获取分类列表' })
  async getCategoryList() {
    return this.productService.getCategoryList();
  }

  @Public()
  @Get('category/:id')
  @ApiOperation({ summary: '获取分类下的商品' })
  @ApiParam({ name: 'id', description: '分类ID' })
  @ApiQuery({ name: 'page', required: false, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量' })
  async getCategoryProducts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.productService.getCategoryProducts(id, pageNum, pageSizeNum);
  }
}
