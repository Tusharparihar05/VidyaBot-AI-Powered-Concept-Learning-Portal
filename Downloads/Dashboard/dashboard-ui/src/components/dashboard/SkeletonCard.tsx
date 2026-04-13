export default function SkeletonCard({ type }: { type: 'text' | 'animation' | 'avatar' }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg shimmer" />
          <div className="w-28 h-4 rounded-lg shimmer" />
        </div>
        <div className="w-16 h-6 rounded-full shimmer" />
      </div>

      <div className="p-4 space-y-3">
        {type === 'text' && (
          <>
            <div className="w-full h-36 rounded-2xl shimmer" />
            <div className="space-y-2">
              <div className="w-full h-3 rounded shimmer" />
              <div className="w-5/6 h-3 rounded shimmer" />
              <div className="w-4/6 h-3 rounded shimmer" />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="h-12 rounded-xl shimmer" />
              <div className="h-12 rounded-xl shimmer" />
              <div className="h-12 rounded-xl shimmer" />
            </div>
          </>
        )}

        {type === 'animation' && (
          <>
            <div className="w-full h-40 rounded-2xl shimmer" />
            <div className="flex gap-2 mt-1">
              <div className="flex-1 h-8 rounded-xl shimmer" />
              <div className="flex-1 h-8 rounded-xl shimmer" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full shimmer" />
              <div className="flex-1 h-2 rounded-full shimmer" />
              <div className="w-12 h-4 rounded shimmer" />
            </div>
          </>
        )}

        {type === 'avatar' && (
          <>
            <div className="w-full h-40 rounded-2xl shimmer" />
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="h-14 rounded-xl shimmer" />
              <div className="h-14 rounded-xl shimmer" />
            </div>
            <div className="w-full h-3 rounded shimmer" />
            <div className="w-3/4 h-3 rounded shimmer" />
          </>
        )}
      </div>
    </div>
  );
}
