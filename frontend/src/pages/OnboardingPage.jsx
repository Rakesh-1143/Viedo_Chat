import { useEffect, useRef, useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { completeOnboarding } from "../lib/api";
<<<<<<< HEAD
import { CameraIcon, LoaderIcon, MapPinIcon, ShipWheelIcon, ShuffleIcon, UploadIcon } from "lucide-react";
=======
import {
  CameraIcon,
  LoaderIcon,
  MapPinIcon,
  ShipWheelIcon,
  ShuffleIcon,
  UploadIcon,
} from "lucide-react";
>>>>>>> e0242ca (updating onbording page)
import { LANGUAGES } from "../constants";
import { useNavigate } from "react-router";

const OnboardingPage = () => {
  const { authUser, isLoading } = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formState, setFormState] = useState({
    fullName: "",
    bio: "",
    nativeLanguage: "",
    learningLanguage: "",
    location: "",
    profilePic: "",
    phoneNumber: "",
  });

  const isUpdating = authUser?.isOnboarding;

  // Sync form state when authUser is loaded
  useEffect(() => {
    if (authUser) {
      setFormState({
        fullName: authUser.fullName || "",
        bio: authUser.bio || "",
        nativeLanguage: authUser.nativeLanguage || "",
        learningLanguage: authUser.learningLanguage || "",
        location: authUser.location || "",
        profilePic: authUser.profilePic || "",
        phoneNumber: authUser.phoneNumber || "",
      });
    }
  }, [authUser]);

  const { mutate: onboardingMutation, isPending } = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
<<<<<<< HEAD
      toast.success(isUpdating ? "Profile updated successfully" : "Profile onboarded successfully");
=======
      toast.success(
        isUpdating
          ? "Profile updated successfully"
          : "Profile onboarded successfully",
      );
>>>>>>> e0242ca (updating onbording page)
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      if (isUpdating) {
        navigate("/");
      }
    },

    onError: (error) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardingMutation(formState);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 3) {
      // 3MB limit for base64
      return toast.error("Image size must be less than 3MB");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormState({ ...formState, profilePic: reader.result });
      toast.success("Image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleRandomAvatar = () => {
    const randomAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(formState.fullName || "User")}&background=random&size=128`;

    setFormState({ ...formState, profilePic: randomAvatar });
    toast.success("New profile picture generated!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="card bg-base-200 w-full max-w-3xl shadow-xl">
=======
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4 overflow-y-auto">
      <div className="card bg-base-200 w-full max-w-3xl shadow-xl my-8">
>>>>>>> e0242ca (updating onbording page)
        <div className="card-body p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {isUpdating ? "Update Your Profile" : "Complete Your Profile"}
            </h1>
            <p className="text-base-content opacity-70">
              {isUpdating
                ? "Keep your information up to date for better matches"
                : "Help others find you by filling in your details"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* PROFILE PIC CONTAINER */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* IMAGE PREVIEW */}
              <div className="size-32 rounded-full ring-4 ring-primary ring-offset-4 ring-offset-base-200 overflow-hidden relative group bg-base-300">
                {formState.profilePic ? (
                  <img
                    src={formState.profilePic}
                    alt="Profile Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formState.fullName || "User")}&background=random`;
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <CameraIcon className="size-12 text-base-content opacity-40" />
                  </div>
                )}
<<<<<<< HEAD
                
                {/* Overlay for clicking to upload */}
                <label 
=======

                {/* Overlay for clicking to upload */}
                <label
>>>>>>> e0242ca (updating onbording page)
                  htmlFor="profile-pic"
                  className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold"
                >
                  <UploadIcon className="size-6 mb-1" />
                  UPLOAD
                </label>
              </div>

<<<<<<< HEAD
              <input 
=======
              <input
>>>>>>> e0242ca (updating onbording page)
                type="file"
                id="profile-pic"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
              />

              {/* ACTION BUTTONS */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <UploadIcon className="size-4" />
                  Upload Photo
                </button>
                <button
                  type="button"
                  onClick={handleRandomAvatar}
                  className="btn btn-outline btn-sm gap-2"
                >
                  <ShuffleIcon className="size-4" />
                  Random Avatar
                </button>
              </div>
            </div>

            {/* FULL NAME */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Full Name</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formState.fullName}
<<<<<<< HEAD
                onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
=======
                onChange={(e) =>
                  setFormState({ ...formState, fullName: e.target.value })
                }
>>>>>>> e0242ca (updating onbording page)
                className="input input-bordered w-full"
                placeholder="Your full name"
              />
            </div>

            {/* PHONE NUMBER */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Phone Number</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formState.phoneNumber}
<<<<<<< HEAD
                onChange={(e) => setFormState({ ...formState, phoneNumber: e.target.value })}
                className="input input-bordered w-full"
                placeholder="+1 234 567 8900"
=======
                onChange={(e) =>
                  setFormState({ ...formState, phoneNumber: e.target.value })
                }
                className="input input-bordered w-full"
                placeholder="+91 9876543210"
>>>>>>> e0242ca (updating onbording page)
              />
            </div>

            {/* BIO */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Bio</span>
              </label>
              <textarea
                name="bio"
                required
                value={formState.bio}
<<<<<<< HEAD
                onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
=======
                onChange={(e) =>
                  setFormState({ ...formState, bio: e.target.value })
                }
>>>>>>> e0242ca (updating onbording page)
                className="textarea textarea-bordered h-24"
                placeholder="Tell others about yourself and your language learning goals"
              />
            </div>

            {/* LANGUAGES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NATIVE LANGUAGE */}
              <div className="form-control">
                <label className="label">
<<<<<<< HEAD
                  <span className="label-text font-semibold">Native Language</span>
=======
                  <span className="label-text font-semibold">
                    Native Language
                  </span>
>>>>>>> e0242ca (updating onbording page)
                </label>
                <select
                  name="nativeLanguage"
                  required
                  value={formState.nativeLanguage}
<<<<<<< HEAD
                  onChange={(e) => setFormState({ ...formState, nativeLanguage: e.target.value })}
=======
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      nativeLanguage: e.target.value,
                    })
                  }
>>>>>>> e0242ca (updating onbording page)
                  className="select select-bordered w-full"
                >
                  <option value="">Select your native language</option>
                  {LANGUAGES.map((lang) => (
                    <option key={`native-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* LEARNING LANGUAGE */}
              <div className="form-control">
                <label className="label">
<<<<<<< HEAD
                  <span className="label-text font-semibold">Learning Language</span>
=======
                  <span className="label-text font-semibold">
                    Learning Language
                  </span>
>>>>>>> e0242ca (updating onbording page)
                </label>
                <select
                  name="learningLanguage"
                  required
                  value={formState.learningLanguage}
<<<<<<< HEAD
                  onChange={(e) => setFormState({ ...formState, learningLanguage: e.target.value })}
=======
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      learningLanguage: e.target.value,
                    })
                  }
>>>>>>> e0242ca (updating onbording page)
                  className="select select-bordered w-full"
                >
                  <option value="">Select language you're learning</option>
                  {LANGUAGES.map((lang) => (
                    <option key={`learning-${lang}`} value={lang.toLowerCase()}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LOCATION */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Location</span>
              </label>
              <div className="relative">
                <MapPinIcon className="absolute top-1/2 transform -translate-y-1/2 left-3 size-5 text-base-content opacity-70" />
                <input
                  type="text"
                  name="location"
                  required
                  value={formState.location}
<<<<<<< HEAD
                  onChange={(e) => setFormState({ ...formState, location: e.target.value })}
=======
                  onChange={(e) =>
                    setFormState({ ...formState, location: e.target.value })
                  }
>>>>>>> e0242ca (updating onbording page)
                  className="input input-bordered w-full pl-10"
                  placeholder="City, Country"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex gap-4 pt-4">
              {isUpdating && (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
              )}
              <button
                className={`btn btn-primary ${isUpdating ? "flex-[2]" : "w-full"}`}
                disabled={isPending}
                type="submit"
              >
                {!isPending ? (
                  <>
                    <ShipWheelIcon className="size-5 mr-2" />
                    {isUpdating ? "Save Changes" : "Complete Onboarding"}
                  </>
                ) : (
                  <>
                    <LoaderIcon className="animate-spin size-5 mr-2" />
                    Saving...
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default OnboardingPage;
