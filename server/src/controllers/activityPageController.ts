/**
 * 活动专题页控制器
 * 【2026-01-19 活动系统增强】
 */
import { Request, Response } from 'express';
import activityPageService from '../services/activityPageService';

// ===== 管理后台接口 =====

/**
 * 获取专题页列表
 */
export async function getPageList(req: Request, res: Response) {
  try {
    const { page, pageSize, status, keyword } = req.query;
    const result = await activityPageService.getPageList({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 10,
      status: status as string,
      keyword: keyword as string,
    });

    res.json({
      code: 0,
      message: 'success',
      data: result,
    });
  } catch (error) {
    console.error('获取专题页列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取专题页列表失败',
      data: null,
    });
  }
}

/**
 * 获取专题页详情
 */
export async function getPageDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const page = await activityPageService.getPageDetail(parseInt(id));

    if (!page) {
      res.status(404).json({
        code: 404,
        message: '专题页不存在',
        data: null,
      });
      return;
    }

    res.json({
      code: 0,
      message: 'success',
      data: page,
    });
  } catch (error) {
    console.error('获取专题页详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取专题页详情失败',
      data: null,
    });
  }
}

/**
 * 创建专题页
 */
export async function createPage(req: Request, res: Response) {
  try {
    const adminUser = (req as any).user;
    const { name, slug, bannerImage, description, startTime, endTime, layout } = req.body;

    if (!name || !slug) {
      res.status(400).json({
        code: 400,
        message: '请填写专题名称和URL标识',
        data: null,
      });
      return;
    }

    // 验证slug格式（只允许字母、数字、连字符）
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({
        code: 400,
        message: 'URL标识只能包含小写字母、数字和连字符',
        data: null,
      });
      return;
    }

    const page = await activityPageService.createPage({
      name,
      slug,
      bannerImage,
      description,
      startTime,
      endTime,
      layout,
      createdBy: adminUser.id,
    });

    res.json({
      code: 0,
      message: '创建成功',
      data: page,
    });
  } catch (error: any) {
    console.error('创建专题页失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '创建专题页失败',
      data: null,
    });
  }
}

/**
 * 更新专题页
 */
export async function updatePage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, slug, bannerImage, description, startTime, endTime, layout } = req.body;

    // 验证slug格式
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({
        code: 400,
        message: 'URL标识只能包含小写字母、数字和连字符',
        data: null,
      });
      return;
    }

    const page = await activityPageService.updatePage(parseInt(id), {
      name,
      slug,
      bannerImage,
      description,
      startTime,
      endTime,
      layout,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: page,
    });
  } catch (error: any) {
    console.error('更新专题页失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '更新专题页失败',
      data: null,
    });
  }
}

/**
 * 删除专题页
 */
export async function deletePage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await activityPageService.deletePage(parseInt(id));

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error: any) {
    console.error('删除专题页失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除专题页失败',
      data: null,
    });
  }
}

/**
 * 切换专题页状态
 */
export async function togglePageStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      res.status(400).json({
        code: 400,
        message: '无效的状态值',
        data: null,
      });
      return;
    }

    const page = await activityPageService.togglePageStatus(parseInt(id), status);

    res.json({
      code: 0,
      message: status === 'ACTIVE' ? '已启用' : '已停用',
      data: page,
    });
  } catch (error: any) {
    console.error('切换专题页状态失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '切换状态失败',
      data: null,
    });
  }
}

/**
 * 添加区块
 */
export async function addSection(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { title, type, content, sort } = req.body;

    if (!type) {
      res.status(400).json({
        code: 400,
        message: '请指定区块类型',
        data: null,
      });
      return;
    }

    const section = await activityPageService.addSection(parseInt(id), {
      title,
      type,
      content,
      sort: sort ? parseInt(sort) : 0,
    });

    res.json({
      code: 0,
      message: '添加成功',
      data: section,
    });
  } catch (error: any) {
    console.error('添加区块失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '添加区块失败',
      data: null,
    });
  }
}

/**
 * 更新区块
 */
export async function updateSection(req: Request, res: Response) {
  try {
    const { sectionId } = req.params;
    const { title, type, content, sort } = req.body;

    const section = await activityPageService.updateSection(parseInt(sectionId), {
      title,
      type,
      content,
      sort: sort !== undefined ? parseInt(sort) : undefined,
    });

    res.json({
      code: 0,
      message: '更新成功',
      data: section,
    });
  } catch (error: any) {
    console.error('更新区块失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '更新区块失败',
      data: null,
    });
  }
}

/**
 * 删除区块
 */
export async function deleteSection(req: Request, res: Response) {
  try {
    const { sectionId } = req.params;
    await activityPageService.deleteSection(parseInt(sectionId));

    res.json({
      code: 0,
      message: '删除成功',
      data: null,
    });
  } catch (error: any) {
    console.error('删除区块失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '删除区块失败',
      data: null,
    });
  }
}

/**
 * 批量更新区块排序
 */
export async function updateSectionSort(req: Request, res: Response) {
  try {
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
      res.status(400).json({
        code: 400,
        message: '无效的排序数据',
        data: null,
      });
      return;
    }

    await activityPageService.updateSectionSort(sections);

    res.json({
      code: 0,
      message: '排序更新成功',
      data: null,
    });
  } catch (error: any) {
    console.error('更新排序失败:', error);
    res.status(400).json({
      code: 400,
      message: error.message || '更新排序失败',
      data: null,
    });
  }
}

// ===== H5前端接口 =====

/**
 * 获取专题页内容（通过slug）
 */
export async function getPageBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;
    const page = await activityPageService.getPageBySlug(slug);

    if (!page) {
      res.status(404).json({
        code: 404,
        message: '专题页不存在或已结束',
        data: null,
      });
      return;
    }

    res.json({
      code: 0,
      message: 'success',
      data: page,
    });
  } catch (error) {
    console.error('获取专题页失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取专题页失败',
      data: null,
    });
  }
}

export default {
  getPageList,
  getPageDetail,
  createPage,
  updatePage,
  deletePage,
  togglePageStatus,
  addSection,
  updateSection,
  deleteSection,
  updateSectionSort,
  getPageBySlug,
};
