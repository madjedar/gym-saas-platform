import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- vi.hoisted ensures these are available when vi.mock() is hoisted to the top ---
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    plan: { findFirst: vi.fn() },
    subscription: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    transaction: { create: vi.fn() },
    attendanceLog: { deleteMany: vi.fn() },
  };
  return { mockPrisma };
});

// --- Mocks ---
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@vercel/blob', () => ({ put: vi.fn().mockResolvedValue({ url: 'https://blob.test/file.jpg' }) }));
vi.mock('@/lib/prisma', () => ({ default: mockPrisma }));
vi.mock('@/lib/rbac', () => ({ requireAuthUser: vi.fn() }));
vi.mock('@/lib/password', () => ({ hashPassword: vi.fn().mockResolvedValue('$2b$12$mockhash') }));

// Import AFTER mocks are set up
import { addMember, assignPlan, deleteMember } from '../actions';
import { requireAuthUser } from '@/lib/rbac';

const GYM_OWNER = { id: 'actor_1', email: 'owner@gym.com', role: 'GYM_OWNER', gymId: 'gym_abc' };
const STAFF_USER = { id: 'actor_2', email: 'staff@gym.com', role: 'STAFF', gymId: 'gym_abc' };

// Helper to build FormData
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(fields)) fd.append(key, val);
  return fd;
}

// ----------------------------------------------------------------
describe('addMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthUser).mockResolvedValue(GYM_OWNER as any);
  });

  it('creates a member in the correct tenant gym', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // no duplicate email
    mockPrisma.$transaction.mockImplementation(async (fn: Function) =>
      fn(mockPrisma)
    );
    mockPrisma.user.create.mockResolvedValue({ id: 'member_new', gymId: 'gym_abc' });

    await addMember(makeFormData({
      firstName: 'Karim',
      lastName: 'Benali',
      email: 'karim@test.com',
    }));

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ gymId: 'gym_abc', role: 'MEMBER' }),
      })
    );
  });

  it('throws if the email already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing_user' }); // duplicate

    await expect(
      addMember(makeFormData({ firstName: 'Ali', lastName: 'Said', email: 'existing@test.com' }))
    ).rejects.toThrow(/déjà inscrit/i);
  });

  it('rejects invalid email (Zod validation)', async () => {
    await expect(
      addMember(makeFormData({ firstName: 'Ali', lastName: 'Said', email: 'not-an-email' }))
    ).rejects.toThrow();
  });
});

// ----------------------------------------------------------------
describe('assignPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthUser).mockResolvedValue(GYM_OWNER as any);
  });

  it('expires old subscriptions before assigning a new plan', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'member_1', gymId: 'gym_abc' }); // member check
    mockPrisma.plan.findFirst.mockResolvedValue({ id: 'plan_1', gymId: 'gym_abc', price: 3000, durationInDays: 30, isActive: true });
    mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(mockPrisma));
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.subscription.create.mockResolvedValue({});
    mockPrisma.transaction.create.mockResolvedValue({});

    await assignPlan(makeFormData({ memberId: 'member_1', planId: 'plan_1' }));

    expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'EXPIRED' } })
    );
    expect(mockPrisma.subscription.create).toHaveBeenCalledOnce();
  });

  it('rejects a plan from a different gym (cross-tenant attack)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'member_1', gymId: 'gym_abc' });
    mockPrisma.plan.findFirst.mockResolvedValue(null); // plan not found in this gym

    await expect(
      assignPlan(makeFormData({ memberId: 'member_1', planId: 'plan_from_other_gym' }))
    ).rejects.toThrow(/introuvable/i);
  });
});

// ----------------------------------------------------------------
describe('deleteMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows GYM_OWNER to delete a member', async () => {
    vi.mocked(requireAuthUser).mockResolvedValue(GYM_OWNER as any);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'member_1', gymId: 'gym_abc' });
    mockPrisma.user.delete.mockResolvedValue({});

    await deleteMember('member_1');

    expect(mockPrisma.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'member_1', gymId: 'gym_abc' } })
    );
  });

  it('blocks STAFF from deleting a member', async () => {
    vi.mocked(requireAuthUser).mockRejectedValue(
      new Error("Accès non autorisé : Le rôle 'STAFF' n'a pas la permission requise.")
    );

    await expect(deleteMember('member_1')).rejects.toThrow(/STAFF/);
  });

  it('rejects memberId that is too short', async () => {
    vi.mocked(requireAuthUser).mockResolvedValue(GYM_OWNER as any);
    await expect(deleteMember('ab')).rejects.toThrow(/invalide/i);
  });

  it('rejects deleting a member from another gym', async () => {
    vi.mocked(requireAuthUser).mockResolvedValue(GYM_OWNER as any);
    mockPrisma.user.findFirst.mockResolvedValue(null); // not found in this gym

    await expect(deleteMember('member_other_gym')).rejects.toThrow(/appartient pas/i);
  });
});
