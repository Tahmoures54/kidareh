export default function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-3.5 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
          <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
          <div className="h-6 bg-gray-200 rounded-full animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
}