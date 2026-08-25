import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";

import PhoneInputScreen from "./PhoneInputScreen";
import OTPVerificationScreen from "./OTPVerificationScreen";
import RoleSelectionScreen, { type UserRole } from "./RoleSelectionScreen";
import RegistrationFormScreen from "./RegistrationFormScreen";

/* ====================== TYPES ====================== */

type OnboardingStep = "phone" | "otp" | "role" | "registration";

/* ====================== COMPONENT ====================== */

/**
 * Onboarding Flow Component
 * Handles the complete registration flow for new users:
 * 1. Phone Input → 2. OTP Verification → 3. Role Selection → 4. Registration Form
 */
export default function OnboardingFlow() {
  const [step, setStep] = useState<OnboardingStep>("phone");
  const [phone, setPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("buyer");

  const handlePhoneVerified = (verifiedPhone: string) => {
    setPhone(verifiedPhone);
    setStep("otp");
  };

  const handleOTPVerified = () => {
    setStep("role");
  };

  const handleRoleSelected = (role: UserRole) => {
    setSelectedRole(role);
    setStep("registration");
  };

  const handleBackFromOTP = () => {
    setStep("phone");
  };

  const handleBackFromRole = () => {
    setStep("otp");
  };

  const handleBackFromRegistration = () => {
    setStep("role");
  };

  return (
    <AnimatePresence mode="wait">
      {step === "phone" && (
        <PhoneInputScreen key="phone" onPhoneVerified={handlePhoneVerified} />
      )}

      {step === "otp" && (
        <OTPVerificationScreen
          key="otp"
          phone={phone}
          onVerified={handleOTPVerified}
          onBack={handleBackFromOTP}
        />
      )}

      {step === "role" && (
        <RoleSelectionScreen
          key="role"
          selectedRole={selectedRole}
          onRoleSelect={setSelectedRole}
          onNext={handleRoleSelected}
        />
      )}

      {step === "registration" && (
        <RegistrationFormScreen
          key="registration"
          phone={phone}
          role={selectedRole}
          onBack={handleBackFromRegistration}
        />
      )}
    </AnimatePresence>
  );
}
