export const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-slate-600 text-xs">
          <p>© {new Date().getFullYear()} Sound Thesis Capital. All projections are illustrative, not guaranteed.</p>
          <p className="mt-2 md:mt-0">
            Built for institutional wealth planning.
          </p>
        </div>
      </div>
    </footer>
  );
};
