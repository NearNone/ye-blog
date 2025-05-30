'use server'

import type {
  CreateArticleParams,
  UpdateArticleParamsWithBlogId,
} from '@/components/shared/admin-article-edit-page'
import { prisma } from '@/db'
import { requireAdmin } from '@/lib/auth'
import { processor } from '@/lib/markdown'
import { revalidatePath } from 'next/cache'

export type WithTagsBlog = Awaited<ReturnType<typeof getAllBlogs>>[number]

export async function createBlog(values: CreateArticleParams) {
  await requireAdmin()

  const existingBlog = await prisma.blog.findUnique({
    where: { slug: values.slug },
  })

  if (existingBlog) {
    throw new Error('该 slug 已存在')
  }

  const relatedTags = await prisma.blogTag.findMany({
    where: {
      tagName: {
        in: values.relatedTagNames,
      },
    },
    select: { id: true },
  })

  if (relatedTags.length > 3) {
    throw new Error('标签数量超过 3 个限制')
  }

  revalidatePath('/blog')

  return await prisma.blog.create({
    data: {
      title: values.title,
      slug: values.slug,
      isPublished: values.isPublished,
      content: values.content,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: {
        connect: relatedTags.map(tag => ({ id: tag.id })),
      },
    },
  })
}

export async function deleteBlogById(blogId: number) {
  await requireAdmin()

  revalidatePath('/blog')

  return prisma.blog.delete({
    where: {
      id: blogId,
    },
  })
}

export async function toggleBlogPublishedById(id: number, newIsPublishedStatus: boolean) {
  await requireAdmin()

  revalidatePath('/blog')

  return await prisma.blog.update({
    where: {
      id,
    },
    data: {
      isPublished: newIsPublishedStatus,
    },
  })
}

export async function updateBlogById(values: UpdateArticleParamsWithBlogId) {
  await requireAdmin()

  const [existingBlog, relatedTags, currentTags] = await Promise.all([
    prisma.blog.findUnique({
      where: {
        slug: values.slug,
        NOT: {
          id: values.id,
        },
      },
    }),
    prisma.blogTag.findMany({
      where: {
        tagName: {
          in: values.relatedTagNames,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.blog.findUnique({
      where: { id: values.id },
      select: {
        tags: {
          select: { id: true },
        },
      },
    }),

  ])

  if (existingBlog) {
    throw new Error('该 slug 已存在')
  }

  if (relatedTags.length > 3) {
    throw new Error('标签数量超过 3 个限制')
  }

  if (!currentTags) {
    throw new Error('Blog 不存在')
  }

  const currentTagIds = currentTags.tags.map(tag => tag.id)
  const newTagIds = relatedTags.map(tag => tag.id)

  const tagsToDisconnect = currentTagIds
    .filter(tagId => !newTagIds.includes(tagId))
    .map(tagId => ({ id: tagId }))

  const tagsToConnect = newTagIds
    .filter(tagId => !currentTagIds.includes(tagId))
    .map(tagId => ({ id: tagId }))

  await prisma.blog.update({
    where: { id: values.id },
    data: {
      tags: {
        disconnect: tagsToDisconnect,
        connect: tagsToConnect,
      },
    },
  })

  revalidatePath('/blog')

  return await prisma.blog.update({
    where: {
      id: values.id,
    },
    data: {
      title: values.title,
      slug: values.slug,
      isPublished: values.isPublished,
      updatedAt: new Date(),
      content: values.content,
    },
  })
}

export async function getQueryBlogs(blogTitle: string) {
  return await prisma.blog.findMany({
    where: {
      title: {
        contains: blogTitle,
      },
    },
    include: {
      tags: true,
    },
  })
}

export async function getAllBlogs() {
  return await prisma.blog.findMany({
    include: {
      tags: true,
    },
  })
}

export async function getTagsOnBlog() {
  return await prisma.blogTag.findMany({
    select: {
      tagName: true,
    },
  })
}

export async function getBlogsBySelectedTagName(tagNamesArray: string[]) {
  const blogs = await prisma.blog.findMany({
    where: {
      AND: [
        {
          tags: {
            some: {
              tagName: { in: tagNamesArray },
            },
          },
        },
      ],
    },
    include: {
      tags: true,
    },
  })

  return blogs.filter((blog) => {
    const blogTagNames = blog.tags.map(tagOnBlog => tagOnBlog.tagName)
    return tagNamesArray.every(tag => blogTagNames.includes(tag))
  })
}

export async function getAllShowBlogs() {
  return await prisma.blog.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getRawBlogBySlug(slug: string) {
  return await prisma.blog.findUnique({
    where: {
      slug,
    },
    include: {
      tags: true,
    },
  })
}

export async function getPublishedBlogHTMLBySlug(slug: string) {
  const blog = await prisma.blog.findUnique({
    where: {
      slug,
      isPublished: true,
    },
    include: {
      tags: true,
    },
  })
  if (!blog || !blog.content)
    return null

  const blogHTML = await processor.process(blog.content)

  return {
    ...blog,
    content: blogHTML.toString(),
  }
}
