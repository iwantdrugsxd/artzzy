export type RootStackParamList = {
  Splash: undefined;
  AuthChoice: undefined;
  EmailSignup: undefined;
  EmailLogin: undefined;
  BasicInfo: undefined;
  PhotoUpload: undefined;
  Bio: undefined;
  QuickBadges: undefined;
  Prompts: undefined;
  VibeQuestion: { index: number };
  Interests: undefined;
  Finish: undefined;
  Home: undefined;
  People: undefined;
  OutingDetails: { outingId: string };
  CreateOuting: {
    locationResult?: {
      name: string;
      address: string;
      lat: number;
      lng: number;
      placeId: string;
      addressLine2?: string;
      landmark?: string;
      instructions?: string;
      fullAddress?: string;
    };
  } | undefined;
  ChatThread: { outingId: string };
  MyProfile: undefined;
  EditProfile: undefined;
  ManagePhotos: undefined;
  ProfilePreview: undefined; // Phase 1: Profile preview screen
  Profile: { userId: string; context?: "people" | "host_request"; outingId?: string };
  HostDashboard: undefined;
  ConnectionRequests: undefined;
  ConnectionReview: { requestId: string };
  DirectChat: { chatId: string; otherUid: string };
  Connections: undefined;
  LocationPicker: {
    initialLocation?: {
      name?: string;
      address?: string;
      lat?: number;
      lng?: number;
      placeId?: string;
    };
  };
  SafetySettings: undefined; // Phase 3: Safety settings screen
  InviteFriends: undefined; // Phase 4: Invite friends screen
  Subscription: undefined; // Phase 4: Subscription management screen
  IdConnectionReview: { requestId: string }; // Connect by User ID: Review screen
};
