
package com.insureit.models;

import java.util.List;

    public record BatchOCRResponse(
            int totalImages,
            List<SerialNumberResponse> results
    ) {




    }

