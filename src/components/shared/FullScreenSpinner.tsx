

const FullScreenSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-black/50 to-black/30  transition-opacity duration-300">
      <div className="relative flex flex-col items-center gap-4">
        {/* Orbiting dots spinner */}
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 animate-[spin_2s_linear_infinite]">
            <span className="absolute left-0 top-0 h-4 w-4 rounded-full bg-primary/80 shadow-[0_0_15px_2px] shadow-primary/60 animate-[pulse_1.5s_ease-in-out_infinite]" />
            <span className="absolute right-0 top-0 h-4 w-4 rounded-full bg-primary/60 shadow-[0_0_10px_1px] shadow-primary/40 animate-[pulse_1.5s_ease-in-out_0.3s_infinite]" />
            <span className="absolute bottom-0 left-0 h-4 w-4 rounded-full bg-primary/40 shadow-[0_0_8px_1px] shadow-primary/20 animate-[pulse_1.5s_ease-in-out_0.6s_infinite]" />
          </div>
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite_reverse]">
            <span className="absolute left-1/2 top-0 h-3 w-3 rounded-full bg-secondary/80 shadow-[0_0_12px_2px] shadow-secondary/50 animate-[pulse_1.5s_ease-in-out_0.9s_infinite]" />
          </div>
        </div>
        {/* Loading message */}
      </div>
      {/* <span className="sr-only">{message}</span> */}
    </div>
  );
};

export default FullScreenSpinner;