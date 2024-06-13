import "./spinner.css";

export const Spinner = () => {
  return (
    <div className="fixed top-0 left-0 z-50 w-screen h-screen bg-black bg-opacity-50 flex items-center justify-center">
      <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-8 w-8"></div>
    </div>
  );
};
