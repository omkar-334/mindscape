import { useVideo } from "../contexts/VideoContext";

const ConsentPopup = () => {
  const { setHasConsented, setShowConsentPopup, startRecording, showConsentPopup } = useVideo();
  
  const handleConsent = () => {
    setHasConsented(true);
    setShowConsentPopup(false);
    startRecording();
  };
  
  const handleDecline = () => {
    setHasConsented(false);
    setShowConsentPopup(false);
  };
  
  if (!showConsentPopup) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Video Recording Consent</h3>
        <p className="text-gray-600 mb-6">
          This website can record video of you while you're using it to enhance your experience. 
          Your video will be analyzed every 10 seconds. Do you consent to video recording?
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            No, thanks
          </button>
          <button
            onClick={handleConsent}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Yes, I consent
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsentPopup;