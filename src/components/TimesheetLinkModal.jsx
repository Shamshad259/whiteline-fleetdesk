import { useState } from "react";
import toast from "react-hot-toast";
import { updateDriver } from "../utils/driverService";
import {
  generateDriverToken,
  deactivateDriverToken,
  updateTokenMaxEntries,
} from "../utils/driverTokenService";
import { ModalShell } from "./ModalShell";

export function TimesheetLinkModal({ isOpen, onClose, driver, onSuccess }) {
  const [maxDailyEntries, setMaxDailyEntries] = useState(
    driver?.timesheetMaxDailyEntries || 3,
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentToken = driver?.currentTimesheetToken;
  const linkUrl = currentToken
    ? `${window.location.origin}/timesheet/${currentToken}`
    : null;

  const handleGenerate = async () => {
    setSaving(true);
    try {
      // Deactivate old token if one exists
      if (currentToken) {
        await deactivateDriverToken(currentToken);
      }
      const newToken = await generateDriverToken(
        driver.id,
        driver.fullName,
        maxDailyEntries,
      );
      await updateDriver(driver.id, {
        currentTimesheetToken: newToken,
        timesheetMaxDailyEntries: maxDailyEntries,
      });
      toast.success(currentToken ? "Link regenerated" : "Link generated");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Error generating link");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMaxEntries = async () => {
    if (!currentToken) return;
    setSaving(true);
    try {
      await updateTokenMaxEntries(currentToken, maxDailyEntries);
      await updateDriver(driver.id, {
        timesheetMaxDailyEntries: maxDailyEntries,
      });
      toast.success("Daily limit updated");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Error updating limit");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!linkUrl) return;
    await navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell
      title={`Timesheet Link — ${driver?.fullName}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {currentToken ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Link
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={linkUrl}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No timesheet link generated yet for this driver.
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Entries Per Day
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={maxDailyEntries}
              onChange={(e) => setMaxDailyEntries(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
            />
            {currentToken && (
              <button
                onClick={handleUpdateMaxEntries}
                disabled={saving}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
              >
                Update
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            How many shift entries this driver can submit per day via their
            link.
          </p>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={handleGenerate}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Working..."
              : currentToken
                ? "Regenerate Link (invalidates old one)"
                : "Generate Link"}
          </button>
          {currentToken && (
            <p className="text-xs text-amber-700 mt-2">
              Regenerating immediately disables the current link. Only do this
              if it's been shared incorrectly or leaked.
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
