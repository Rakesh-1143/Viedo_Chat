import { memo } from "react";
import { LANGUAGE_TO_FLAG } from "../constants";

const LanguageFlag = memo(({ language }) => {
  if (!language) return null;

  const langLower = language.toLowerCase();
  const countryCode = LANGUAGE_TO_FLAG[langLower];

  if (countryCode) {
    return (
      <img
        src={`https://flagcdn.com/24x18/${countryCode}.png`}
        alt={`${langLower} flag`}
        className="h-3 mr-1 inline-block"
        onError={(e) => (e.target.style.display = "none")}
      />
    );
  }
  return null;
});

LanguageFlag.displayName = "LanguageFlag";
export default LanguageFlag;
