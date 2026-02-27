export function Loading() {
  return (
    <div className="w-full h-full fixed top-0 left-0 bg-background opacity-75 z-50">
      <div className="flex justify-center items-center mt-[50vh]">
        <svg
          width="80"
          height="80"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid"
          aria-busy="true"
          role="progressbar"
          className="loading"
        >
          <rect x="17" y="17" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="40" y="17" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.125s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="63" y="17" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.25s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="17" y="40" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.875s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="63" y="40" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.375s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="17" y="63" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.75s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="40" y="63" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.625s"
              calcMode="discrete"
            ></animate>
          </rect>
          <rect x="63" y="63" width="20" height="20" fill="#577c9b">
            <animate
              attributeName="fill"
              values="currentColor;#577c9b;#577c9b"
              keyTimes="0;0.125;1"
              dur="1s"
              repeatCount="indefinite"
              begin="0.5s"
              calcMode="discrete"
            ></animate>
          </rect>
        </svg>
      </div>
    </div>
  );
}
