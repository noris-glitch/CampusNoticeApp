import { API_PATHS, getRequest, postRequest } from './api-core';
import type {
  NoticeDetailResponse,
  NoticeItem,
  NotificationsResponse,
  SimpleSuccessResponse,
  StoredUser,
} from './api-types';

function authParams(user: StoredUser) {
  return {
    token: user.token,
    user_id: user.user_id,
  };
}

export async function fetchNotices(user: StoredUser): Promise<NoticeItem[]> {
  const response = await getRequest<{ notices: NoticeItem[]; success: boolean }>(API_PATHS.notices, authParams(user));
  return response.notices;
}

export async function fetchNoticeDetail(user: StoredUser, noticeId: number): Promise<NoticeDetailResponse> {
  return getRequest<NoticeDetailResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    notice_id: noticeId,
  });
}

export async function toggleNoticeBookmark(user: StoredUser, noticeId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'bookmark',
    notice_id: noticeId,
  });
}

export async function acknowledgeNotice(user: StoredUser, noticeId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'acknowledge',
    notice_id: noticeId,
  });
}

export async function addNoticeComment(
  user: StoredUser,
  noticeId: number,
  comment: string
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'add_comment',
    comment,
    notice_id: noticeId,
  });
}

export async function answerNoticeComment(
  user: StoredUser,
  noticeId: number,
  commentId: number,
  answer: string
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'answer_comment',
    answer,
    comment_id: commentId,
    notice_id: noticeId,
  });
}

export async function updateNoticeCommentStatus(
  user: StoredUser,
  noticeId: number,
  commentId: number,
  action: 'hide_comment' | 'reopen_comment'
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action,
    comment_id: commentId,
    notice_id: noticeId,
  });
}

export async function deleteNoticeComment(
  user: StoredUser,
  noticeId: number,
  commentId: number
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'delete_comment',
    comment_id: commentId,
    notice_id: noticeId,
  });
}

export async function markNoticeViewed(user: StoredUser, noticeId: number): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.noticeActions, {
    ...authParams(user),
    action: 'view',
    notice_id: noticeId,
  });
}

export async function fetchNotifications(user: StoredUser): Promise<NotificationsResponse> {
  return getRequest<NotificationsResponse>(API_PATHS.notifications, authParams(user));
}

export async function runNotificationAction(
  user: StoredUser,
  action: 'mark_all_read' | 'mark_read' | 'delete_all',
  notificationId?: number
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.notifications, {
    ...authParams(user),
    action,
    notification_id: notificationId,
  });
}

export async function fetchBookmarks(user: StoredUser): Promise<NoticeItem[]> {
  const response = await getRequest<{ bookmarks: NoticeItem[]; success: boolean }>(
    API_PATHS.bookmarks,
    authParams(user)
  );
  return response.bookmarks;
}

export async function fetchArchiveNotices(user: StoredUser): Promise<NoticeItem[]> {
  const response = await getRequest<{ notices: NoticeItem[]; success: boolean }>(
    API_PATHS.archive,
    authParams(user)
  );
  return response.notices;
}
