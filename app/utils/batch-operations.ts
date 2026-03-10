/**
 * Utility functions for batched operations with rate limiting protection
 */

interface BatchOperationOptions {
  batchSize: number;
  baseDelay: number;
  maxRetries: number;
  retryMultiplier: number;
}

interface BatchResult<T, R = unknown> {
  successful: Array<{ item: T; result: R }>;
  failed: Array<{ item: T; error: string; retryCount: number }>;
  totalProcessed: number;
}

/**
 * Execute operations in batches with exponential backoff on failures
 */
export const executeBatchOperations = async <T, R = unknown>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: Partial<BatchOperationOptions> = {}
): Promise<BatchResult<T, R>> => {
  const config = {
    batchSize: 3,
    baseDelay: 300,
    maxRetries: 2,
    retryMultiplier: 2,
    ...options
  };

  const successful: Array<{ item: T; result: R }> = [];
  const failed: Array<{ item: T; error: string; retryCount: number }> = [];
  let totalProcessed = 0;

  // Process items in batches
  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    const batchNumber = Math.floor(i / config.batchSize) + 1;
    const totalBatches = Math.ceil(items.length / config.batchSize);

    console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);

    // Process batch with retry logic
    const batchResults = await Promise.allSettled(
      batch.map(async item => {
        let lastError: Error | null = null;
        
        for (let retryCount = 0; retryCount <= config.maxRetries; retryCount++) {
          try {
            const result = await operation(item);
            return { item, result };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            
            if (retryCount < config.maxRetries) {
              // Wait before retry with exponential backoff
              const retryDelay = config.baseDelay * Math.pow(config.retryMultiplier, retryCount);
              console.warn(`⚠️  Operation failed, retrying in ${retryDelay}ms (attempt ${retryCount + 2}/${config.maxRetries + 1})`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
        
        // All retries exhausted
        throw lastError;
      })
    );

    // Process batch results
    batchResults.forEach((result, index) => {
      totalProcessed++;
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          item: batch[index],
          error: result.reason?.message || 'Unknown error',
          retryCount: config.maxRetries
        });
      }
    });

    // Add delay between batches if not the last batch
    if (i + config.batchSize < items.length) {
      const delay = config.baseDelay + (failed.length > 0 ? config.baseDelay : 0); // Extra delay if failures occurred
      console.log(`⏱️  Waiting ${delay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    successful,
    failed,
    totalProcessed
  };
};

/**
 * Rate-limited audit logging to prevent overwhelming the audit service
 */
export const batchedAuditLog = async (
  auditEntries: Array<() => Promise<void>>,
  options: { batchSize?: number; delay?: number } = {}
): Promise<{ successful: number; failed: number }> => {
  const { batchSize = 2, delay = 500 } = options;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < auditEntries.length; i += batchSize) {
    const batch = auditEntries.slice(i, i + batchSize);
    
    const results = await Promise.allSettled(
      batch.map(auditFn => auditFn())
    );

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        successful++;
      } else {
        failed++;
        console.error('Audit logging failed:', result.reason);
      }
    });

    // Add delay between audit batches
    if (i + batchSize < auditEntries.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { successful, failed };
};