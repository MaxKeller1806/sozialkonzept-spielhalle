import Image from "next/image";

const LOGIN_CAMPUS_BUILDING_SRC = "/images/login-campus-building.jpg";

/** Schulungszentrum im unteren linken Branding-Bereich – dezent, mit Blau-Overlay. */
export function LoginBuildingBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <Image
        src={LOGIN_CAMPUS_BUILDING_SRC}
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 58vw"
        className="object-cover object-[center_75%]"
      />
    </div>
  );
}
