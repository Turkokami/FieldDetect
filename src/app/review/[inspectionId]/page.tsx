"use client";

import { useState, useEffect } from "react";

type InspectionData = {
  inspectionNumber: string;
  customerRating: number | null;
  property: { name: string };
  appointment: { customer: { firstName: string } };
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function ReviewPage({ params }: { params: Promise<{ inspectionId: string }> }) {
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ inspectionId: id }) => {
      setInspectionId(id);
      fetch(`/api/public/review/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) { setNotFound(true); return; }
          setInspection(d.data);
          if (d.data.customerRating) setDone(true);
        })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    });
  }, [params]);

  const submit = async () => {
    if (!inspectionId || !rating) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/review/${inspectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback: feedback || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F4FFFE" }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "#0ABAB5", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Review not found</h1>
          <p className="text-gray-500 text-sm">This link may have expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F4FFFE" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)" }}>
            <span className="text-white">🐾</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">FieldDetect</span>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {inspection?.customerRating && inspection.customerRating >= 4 ? "Thanks for the great review!" : "Thank you for your feedback!"}
            </h2>
            <p className="text-gray-500 text-sm">
              Your feedback helps us deliver better service.
            </p>
            {rating >= 5 && (
              <p className="text-xs text-gray-400 mt-4">
                If you&apos;d like, consider sharing your experience on Google Reviews — it really helps our business!
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">How did we do?</h2>
              {inspection && (
                <p className="text-gray-500 text-sm mt-1">
                  K9 Inspection at <strong>{inspection.property.name}</strong>
                  {inspection.inspectionNumber && ` · ${inspection.inspectionNumber}`}
                </p>
              )}
            </div>

            {/* Star rating */}
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                >
                  <span style={{ color: (hover || rating) >= star ? "#f59e0b" : "#d1d5db" }}>★</span>
                </button>
              ))}
            </div>

            {(hover > 0 || rating > 0) && (
              <p className="text-center text-sm font-medium mb-5" style={{ color: "#0ABAB5" }}>
                {STAR_LABELS[hover || rating]}
              </p>
            )}
            {hover === 0 && rating === 0 && <div className="mb-5" />}

            {rating > 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tell us more <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    placeholder="What went well? Anything we can improve?"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0ABAB5]/40 focus:border-[#0ABAB5] resize-none"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-px disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #0ABAB5 0%, #0D9488 100%)", boxShadow: "0 2px 12px rgba(10,186,181,0.3)" }}
                >
                  {submitting ? "Submitting…" : "Submit Review →"}
                </button>
              </div>
            )}

            {rating === 0 && (
              <p className="text-center text-xs text-gray-400">Click a star to rate your experience</p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-5">
          Powered by FieldDetect · K9 Inspection Management
        </p>
      </div>
    </div>
  );
}
