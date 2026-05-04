/** Admin university routes — keep redirects and cache invalidation aligned. */
export const universitiesAdminRoutes = {
  root: "/dashboard/admin/universities",
  add: "/dashboard/admin/universities/add",
  manage: "/dashboard/admin/universities/manage",
  importCourses: "/dashboard/admin/universities/import-courses",
} as const;
