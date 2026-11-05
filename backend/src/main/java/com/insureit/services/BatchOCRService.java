package com.insureit.services;

import com.insureit.models.BatchOCRResponse;
import com.insureit.models.SerialNumberResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@Service
public class BatchOCRService {

    private final GroqApiService groqApiService;
    private final ExecutorService executor;

    public   BatchOCRService(GroqApiService groqApiService, ExecutorService executor) {
        this.groqApiService = groqApiService;
        this.executor = executor;
    }

    public BatchOCRResponse processBatch(List<String> base64Images)throws ExecutionException, InterruptedException {

        Executors.newFixedThreadPool(5);
        List<SerialNumberResponse> serialNumberResponses = new ArrayList<>();
        List<Future<SerialNumberResponse>> futures = new ArrayList<>();

        for (String base64Image : base64Images) {

            Future<SerialNumberResponse> future= executor.submit(()->
                    groqApiService.sendToGroq(base64Image));

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
