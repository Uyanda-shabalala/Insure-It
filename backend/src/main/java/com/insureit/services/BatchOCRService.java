package com.insureit.services;

import com.insureit.models.BatchOCRResponse;
import com.insureit.models.SerialNumberResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

@Service
public class BatchOCRService {

    private final OcrService ocrService;
    private final ExecutorService executor;

    public   BatchOCRService(OcrService ocrService, ExecutorService executor) {
        this.ocrService = ocrService;
        this.executor = executor;
    }

    public BatchOCRResponse processBatch(List<String> base64Images)throws ExecutionException, InterruptedException {

        List<SerialNumberResponse> serialNumberResponses = new ArrayList<>();
        List<Future<SerialNumberResponse>> futures = new ArrayList<>();

        for (String base64Image : base64Images) {

            Future<SerialNumberResponse> future= executor.submit(()->
                    ocrService.extract(base64Image));

            futures.add(future);

        };

        for  (Future<SerialNumberResponse> future : futures) {


            serialNumberResponses.add(future.get());
        }
        return new BatchOCRResponse(
                base64Images.size(),
                serialNumberResponses
        );




    }



}
