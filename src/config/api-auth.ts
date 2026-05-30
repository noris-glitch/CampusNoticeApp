import { API_PATHS, getRequest, postRequest } from './api-core';
import type {
  BootstrapResponse,
  FeedbackResponse,
  RegistrationOptionsResponse,
  SimpleSuccessResponse,
  StoredUser,
} from './api-types';

function authParams(user: StoredUser) {
  return {
    token: user.token,
    user_id: user.user_id,
  };
}

export async function loginWithPassword(email: string, password: string): Promise<StoredUser> {
  const response = await postRequest<StoredUser & { success: boolean; error?: string }>(API_PATHS.login, {
    email,
    password,
  });

  if (!response.success) {
    throw new Error(response.error || 'Login failed');
  }

  return response;
}

export async function fetchRegistrationOptions(): Promise<RegistrationOptionsResponse> {
  const response = await getRequest<RegistrationOptionsResponse>(API_PATHS.register);

  if (
    !response.success ||
    !Array.isArray(response.faculties) ||
    !Array.isArray(response.departments) ||
    !Array.isArray(response.years)
  ) {
    throw new Error('Registration options are temporarily unavailable.');
  }

  return response;
}

export async function registerStudent(payload: {
  confirm_password: string;
  department_id?: number | null;
  department_name?: string | null;
  email: string;
  faculty_id?: number | null;
  membership?: string | null;
  name: string;
  password: string;
  phone_number?: string | null;
  student_id: string;
  year: number;
}): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.register, payload);
}

export async function requestPasswordReset(email: string): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.passwordReset, {
    action: 'request_reset',
    email,
  });
}

export async function submitPasswordReset(payload: {
  confirm_password: string;
  password: string;
  token: string;
}): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.passwordReset, {
    action: 'reset_password',
    ...payload,
  });
}

export async function fetchFeedback(user: StoredUser): Promise<FeedbackResponse> {
  return getRequest<FeedbackResponse>(API_PATHS.feedback, authParams(user));
}

export async function submitFeedback(
  user: StoredUser,
  payload: {
    category: string;
    message: string;
    subject: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.feedback, {
    ...authParams(user),
    action: 'submit',
    ...payload,
  });
}

export async function respondToFeedback(
  user: StoredUser,
  payload: {
    admin_response: string;
    feedback_id: number;
    status?: string;
  }
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.feedback, {
    ...authParams(user),
    action: 'respond',
    ...payload,
  });
}

export async function updateFeedbackStatus(
  user: StoredUser,
  feedbackId: number,
  status: string
): Promise<SimpleSuccessResponse> {
  return postRequest<SimpleSuccessResponse>(API_PATHS.feedback, {
    ...authParams(user),
    action: 'set_status',
    feedback_id: feedbackId,
    status,
  });
}

export async function fetchBootstrap(
  user: StoredUser,
  analyticsRange?: 'daily' | 'monthly' | 'weekly'
): Promise<BootstrapResponse> {
  return getRequest<BootstrapResponse>(API_PATHS.bootstrap, {
    ...authParams(user),
    analytics_range: analyticsRange,
  });
}
