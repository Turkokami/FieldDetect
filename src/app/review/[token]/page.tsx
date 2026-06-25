"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const STARS = [1, 2, 3, 4, 5];

type ReviewInfo = {
  inspectionNumber: string;
  propertyName: string;
  orgName: string;
  orgLogoUrl: string | null;
  googleReviewUrl: string | null;
  alreadyReviewed: boolean;
  customerRating: number | null;
};

export default function ReviewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [info, setInfo] = useState<ReviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/public/review/token/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); }
        else { setInfo(d.data); if (d.data.alreadyReviewed) setSubmitted(true); }
      })
      .catch(() => setError("Unable to load review page."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/review/token/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setSubmitted(true);
      if (rating >= 4 && info?.googleReviewUrl) {
        setTimeout(() => { window.location.href = info.googleReviewUrl!; }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Review link expired</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const teal = "#0ABAB5";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#0ABAB5,#0D9488)" }} className="px-6 py-5">
          <div className="flex items-center gap-3">
            {info?.orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.orgLogoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🐾</div>
            )}
            <div>
              <div className="text-white font-bold text-lg">{info?.orgName}</div>
              <div className="text-white/70 text-xs">K9 Inspection Services</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h2>
              <p className="text-sm text-gray-500 mb-4">
                Your feedback means a lot to us.
              </p>
              {rating >= 4 && info?.googleReviewUrl && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-800 mb-2">
                    We&apos;re glad you had a great experience!
                  </p>
                  <p className="text-xs text-green-700 mb-3">
                    Redirecting you to Google Reviews in a moment...
                  </p>
                  <a
                    href={info.googleReviewUrl}
                    style={{ background: "#4285F4" }}
                    className="inline-block text-white text-sm font-bold py-2 px-5 rounded-lg"
                  >
                    Leave a Google Review ⭐
                  </a>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Rate your inspection</h2>
                <p className="text-sm text-gray-500">
                  {info?.propertyName} · #{info?.inspectionNumber}
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-6">
                {STARS.map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                    style={{ color: star <= (hovered || rating) ? "#FBBF24" : "#E5E7EB" }}
                  >
                    ★
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <div className="text-center text-sm font-medium mb-4" style={{ color: teal }}>
                  {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Could be better" : "Not satisfied"}
                </div>
              )}

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Any additional comments? (optional)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 mb-4"
                style={{ "--tw-ring-color": teal } as React.CSSProperties}
              />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!rating || submitting}
                style={{ background: !rating || submitting ? "#94a3b8" : teal }}
                className="w-full text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
