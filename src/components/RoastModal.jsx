import { useState } from "react";

function RoastModal({ message, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareMessage = () => {
    if (navigator.share) {
      navigator.share({
        title: "My Dramatunes Roast 🎵",
        text: message,
      }).catch(err => console.log(err));
    } else {
      alert("Sharing not supported.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white p-6 rounded-lg w-11/12 max-w-md">
        <h2 className="text-xl font-bold mb-4">🔥 Your Music Roast 🔥</h2>
        <p className="mb-4 break-words">{message}</p>
        <div className="flex justify-between">
          <button
            className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700"
            onClick={copyToClipboard}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            onClick={shareMessage}
          >
            Share
          </button>
          <button
            className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoastModal;