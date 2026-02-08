import React, { useCallback } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { RootStackParamList } from "./src/types/navigation";
import { logger } from "./src/utils/logger";
import SplashScreen from "./src/screens/SplashScreen";
import AuthChoiceScreen from "./src/screens/AuthChoiceScreen";
import EmailSignupScreen from "./src/screens/EmailSignupScreen";
import EmailLoginScreen from "./src/screens/EmailLoginScreen";
import BasicInfoScreen from "./src/screens/onboarding/BasicInfoScreen";
import PhotoUploadScreen from "./src/screens/onboarding/PhotoUploadScreen";
import BioScreen from "./src/screens/onboarding/BioScreen";
import QuickBadgesScreen from "./src/screens/onboarding/QuickBadgesScreen";
import PromptsScreen from "./src/screens/onboarding/PromptsScreen";
import VibeQuestionScreen from "./src/screens/onboarding/VibeQuestionScreen";
import InterestsScreen from "./src/screens/onboarding/InterestsScreen";
import FinishScreen from "./src/screens/onboarding/FinishScreen";
import HomeTabs from "./src/navigation/HomeTabs";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import ManagePhotosScreen from "./src/screens/ManagePhotosScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import OutingDetailsScreen from "./src/screens/OutingDetailsScreen";
import PeopleScreen from "./src/screens/PeopleScreen";
import CreateOutingScreen from "./src/screens/CreateOutingScreen";
import OutingChatScreen from "./src/screens/OutingChatScreen";
import HostDashboardScreen from "./src/screens/HostDashboardScreen";
import ConnectionRequestsScreen from "./src/screens/ConnectionRequestsScreen";
import ConnectionReviewScreen from "./src/screens/ConnectionReviewScreen";
import DirectChatScreen from "./src/screens/DirectChatScreen";
import ConnectionsScreen from "./src/screens/ConnectionsScreen";
import LocationPickerScreen from "./src/screens/LocationPickerScreen";
import ProfilePreviewScreen from "./src/screens/ProfilePreviewScreen";
import SafetySettingsScreen from "./src/screens/SafetySettingsScreen";
import InviteFriendsScreen from "./src/screens/InviteFriendsScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import IdConnectionReviewScreen from "./src/screens/IdConnectionReviewScreen";

const Stack = createStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

const AppNavigator = () => {
  const { user, profile, loading } = useAuth();

  const handleStateChange = useCallback(() => {
    const route = navigationRef.getCurrentRoute();
    if (route) {
      logger.info("nav.change", { name: route.name, params: route.params });
    }
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="AuthChoice" component={AuthChoiceScreen} />
            <Stack.Screen name="EmailSignup" component={EmailSignupScreen} />
            <Stack.Screen name="EmailLogin" component={EmailLoginScreen} />
          </>
        ) : profile?.onboarding_complete ? (
          <>
            <Stack.Screen name="Home" component={HomeTabs} />
            <Stack.Screen name="People" component={PeopleScreen} />
            <Stack.Screen name="OutingDetails" component={OutingDetailsScreen} />
            <Stack.Screen name="CreateOuting" component={CreateOutingScreen} />
            <Stack.Screen name="ChatThread" component={OutingChatScreen} />
            <Stack.Screen name="HostDashboard" component={HostDashboardScreen} />
            <Stack.Screen name="ConnectionRequests" component={ConnectionRequestsScreen} />
            <Stack.Screen name="ConnectionReview" component={ConnectionReviewScreen} />
            <Stack.Screen name="DirectChat" component={DirectChatScreen} />
            <Stack.Screen name="Connections" component={ConnectionsScreen} />
            <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
            <Stack.Screen name="MyProfile" component={MyProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ManagePhotos" component={ManagePhotosScreen} />
            <Stack.Screen name="ProfilePreview" component={ProfilePreviewScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="SafetySettings" component={SafetySettingsScreen} />
            <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} />
            <Stack.Screen name="IdConnectionReview" component={IdConnectionReviewScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="BasicInfo" component={BasicInfoScreen} />
            <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
            <Stack.Screen name="Bio" component={BioScreen} />
            <Stack.Screen name="QuickBadges" component={QuickBadgesScreen} />
            <Stack.Screen name="Prompts" component={PromptsScreen} />
            <Stack.Screen name="VibeQuestion" component={VibeQuestionScreen} />
            <Stack.Screen name="Interests" component={InterestsScreen} />
            <Stack.Screen name="Finish" component={FinishScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
