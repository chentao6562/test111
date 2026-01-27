/**
 * 区域API
 * @since 2026-01-21
 */
import { get } from './index'

// 区域类型
export interface Region {
  id: number
  name: string
  level: number
  children?: Region[]
}

// 级联选择器选项类型
export interface RegionCascaderOption {
  value: number
  label: string
  children?: RegionCascaderOption[]
}

/**
 * 获取区域树形结构（区县 -> 乡镇/街道）
 */
export const getRegionTree = () => {
  return get<Region[]>('/regions')
}

/**
 * 获取区域列表（平铺）
 */
export const getRegionList = (level?: number) => {
  return get<Region[]>('/regions/list', level ? { level } : undefined)
}

/**
 * 获取区域详情
 */
export const getRegionById = (id: number) => {
  return get<Region>(`/regions/${id}`)
}

/**
 * 将区域树转换为级联选择器选项
 */
export const convertToRegionOptions = (regions: Region[]): RegionCascaderOption[] => {
  return regions.map(district => ({
    value: district.id,
    label: district.name,
    children: district.children?.map(town => ({
      value: town.id,
      label: town.name
    }))
  }))
}

/**
 * 根据区域ID获取完整的区域名称
 * @param regionId 区域ID（乡镇/街道级）
 * @param regions 区域树
 * @returns 格式化的区域名称，如 "赛罕区 - 大学西路街道"
 */
export const getRegionFullName = (regionId: number | string, regions: Region[]): string => {
  // 【2026-01-26修复】确保ID类型一致进行比较
  const targetId = typeof regionId === 'string' ? parseInt(regionId, 10) : regionId
  for (const district of regions) {
    if (district.children) {
      const town = district.children.find(t => t.id === targetId)
      if (town) {
        return `${district.name} - ${town.name}`
      }
    }
  }
  return ''
}
