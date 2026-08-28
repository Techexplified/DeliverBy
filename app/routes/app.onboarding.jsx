import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import { redirect, useFetcher, useLoaderData, useNavigate } from "react-router";
import { getOnboardingData, saveOnboardingData } from "../models/onboarding.server";
import { Step1, Step2, Step3, Step4, Step5, Step6 } from "../components/Onboarding/steps";
import { LivePreview } from "../components/Onboarding/LivePreview";
import "../styles/onboarding.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const shopData = await getOnboardingData(shopDomain);
  return { initialData: shopData };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const payload = await request.json();

  if (payload?.intent === "save" || payload?.intent === "skip") {
    await saveOnboardingData(shopDomain, payload);
    if (payload.intent === "skip") {
      return redirect("/app");
    }
    return { success: true };
  }

  return null;
};

function CustomStepper({ currentStep, onStepClick, maxReached }) {
  const STEPS = ["Packing", "Open Days", "Shipping", "Exceptions", "Go Live"];

  return (
    <div className="ob-rail">
      {STEPS.map((label, index) => {
        const stepNum = index + 1;
        const isDone = currentStep > stepNum || currentStep === 6;
        const isCurrent = currentStep === stepNum;
        const canClick = stepNum <= maxReached && currentStep !== 6;

        return (
          <button
            key={label}
            type="button"
            className={`rail-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""} ${canClick ? "clickable" : ""}`}
            onClick={() => canClick && onStepClick(stepNum)}
            disabled={!canClick}
          >
            <span className="rail-circle">{isDone ? "✓" : stepNum}</span>
            <span className="rail-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const { initialData } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const storeHandle = initialData?.shop ? initialData?.shop.split(".")[0] : "";
  const themeCustomizerUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?template=product`;

  const [currentStep, setCurrentStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [formData, setFormData] = useState({
    cutoffTime: initialData?.cutoffTime || "14:00",
    timezone: initialData?.timezone || "Asia/Kolkata",
    procMin: initialData?.procMin ?? 1,
    procMax: initialData?.procMax ?? 2,
    oosEnabled: initialData?.oosEnabled ?? true,
    oosDays: initialData?.oosDays ?? 10,
    workingDays: initialData?.workingDays || [1, 2, 3, 4, 5, 6],
    carrierSat: initialData?.carrierSat ?? false,
    carrierSun: initialData?.carrierSun ?? false,
    homeCountry: initialData?.homeCountry || "IN",
    widgetPosition: initialData?.widgetPosition || "below-atc",
    closures: initialData?.closures || [],
    zones: initialData?.zones?.length ? initialData.zones : [
      { name: "India domestic", countries: ["IN"], transitMin: 2, transitMax: 4, isHome: true, isFallback: false },
      { name: "United States", countries: ["US"], transitMin: 6, transitMax: 9, isHome: false, isFallback: false },
      { name: "Europe", countries: ["GB", "DE", "FR", "NL", "IE", "ES", "IT"], transitMin: 5, transitMax: 8, isHome: false, isFallback: false },
      { name: "Australia & New Zealand", countries: ["AU", "NZ"], transitMin: 8, transitMax: 12, isHome: false, isFallback: false },
      { name: "Rest of world", countries: [], transitMin: 12, transitMax: 24, isHome: false, isFallback: true },
    ],
    rules: initialData?.rules?.length > 0 ? initialData.rules : [
      { matchField: "type", matchOperator: "is", matchValue: "Made to order", behaviour: "estimate", procMin: 14, procMax: 21, isEnabled: false },
      { matchField: "tag", matchOperator: "is", matchValue: "preorder", behaviour: "merchant", procMin: 0, procMax: 0, isEnabled: false },
      { matchField: "type", matchOperator: "is", matchValue: "Digital", behaviour: "hide", procMin: 0, procMax: 0, isEnabled: false },
    ],
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep === 5) {
      handleSave();
      setCurrentStep(6);
    } else if (currentStep < 5) {
      const next = currentStep + 1;
      setCurrentStep(next);
      setMaxReached((prev) => Math.max(prev, next));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((c) => c - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSave = () => {
    const payload = {
      intent: "save",
      shopSettings: {
        cutoffTime: formData.cutoffTime,
        timezone: formData.timezone,
        procMin: formData.procMin,
        procMax: formData.procMax,
        oosEnabled: formData.oosEnabled,
        oosDays: formData.oosDays,
        workingDays: formData.workingDays,
        carrierSat: formData.carrierSat,
        carrierSun: formData.carrierSun,
        homeCountry: formData.homeCountry,
        widgetPosition: formData.widgetPosition,
      },
      closures: formData.closures,
      zones: formData.zones,
      rules: formData.rules,
    };

    fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });
  };

  const handleSkip = () => {
    fetcher.submit(
      { intent: "skip", shopSettings: {}, closures: [], zones: [], rules: [] },
      { method: "POST", encType: "application/json" }
    );
  };

  const embedfetcher = useFetcher();
  const isEmbedded = Boolean(embedfetcher?.data?.isEmbedded);

  useEffect(() => {
    if (currentStep < 5) return;

    embedfetcher.load("/app/api/check-embed");

    const interval = setInterval(() => {
      embedfetcher.load("/app/api/check-embed");
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        embedfetcher.load("/app/api/check-embed");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentStep]);



  return (
    <div className="onboarding-page">
      <div className="ob-container">
        {/* Header */}
        <header className="ob-header">
          <div className="ob-logo">
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1.6" y="4.8" width="9.4" height="7.6" rx="1.2" />
              <path d="M11 7.4h2.6l2.6 2.7v2.3H11z" />
              <circle cx="4.9" cy="13.4" r="1.6" fill="#fff" stroke="none" />
              <circle cx="12.8" cy="13.4" r="1.6" fill="#fff" stroke="none" />
            </svg>
          </div>
          <div className="ob-header-text">
            <h1>Set up DeliverBy</h1>
            <p>
              Five simple questions about how you pack and ship. Your product pages start showing accurate delivery dates immediately.
            </p>
          </div>
          {currentStep < 6 && (
            <button type="button" className="btn btn-sm" onClick={handleSkip}>
              Skip for now
            </button>
          )}
        </header>

        {/* Stepper Bar */}
        <CustomStepper
          currentStep={currentStep}
          onStepClick={(step) => setCurrentStep(step)}
          maxReached={maxReached}
        />

        {/* Main Content Layout */}
        <div className="ob-layout">
          {/* Left Column: Active Step Form */}
          <div>
            {currentStep === 1 && <Step1 formData={formData} updateField={updateField} />}
            {currentStep === 2 && <Step2 formData={formData} updateField={updateField} />}
            {currentStep === 3 && <Step3 formData={formData} updateField={updateField} />}
            {currentStep === 4 && <Step4 formData={formData} updateField={updateField} />}
            {currentStep === 5 && <Step5 formData={formData} updateField={updateField} url={themeCustomizerUrl} isEmbedded={isEmbedded} />}
            {currentStep === 6 && (
              <Step6
                formData={formData}
                isEmbedded={isEmbedded}
                url={themeCustomizerUrl}
                onFinish={() => navigate("/app")}
              />
            )}
          </div>

          {/* Right Column: Sticky Live Preview */}
          <aside>
            <LivePreview formData={formData} currentStep={currentStep} />
          </aside>
        </div>
      </div>

      {/* Sticky Bottom Navigation Footer */}
      {currentStep < 6 && (
        <div className="ob-footer">
          <div className="ob-footer-inner">
            <span className="ob-progress-text">Step {currentStep} of 5</span>
            <div className="ob-footer-actions">
              {currentStep > 1 && (
                <button type="button" className="btn" onClick={handlePrev}>
                  Back
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                {currentStep === 5 ? "Finish setup" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}