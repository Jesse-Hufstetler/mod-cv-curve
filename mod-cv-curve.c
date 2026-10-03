#include <math.h>
#include <stdlib.h>
#include "lv2/lv2plug.in/ns/lv2core/lv2.h"
#define PLUGIN_URI "https://jesse-hufstetler.github.io/plugins/cv-curve"

typedef enum {
	CV_INPUT,
	CV_OUTPUT,
	CURVE,
	INPUT_VALUE,
	OUTPUT_VALUE
} PortIndex;
typedef struct {
    float* cv_input;
    float* cv_output;
    float* curve;
    float* input_value;
    float* output_value;
} StateData;
static LV2_Handle instantiate(const LV2_Descriptor* descriptor, double rate, const char* bundle_path, const LV2_Feature* const* features) {
	StateData* stateData = (StateData*)calloc(1, sizeof(StateData));
	return (LV2_Handle)stateData;
}
static void connect_port(LV2_Handle instance, uint32_t port, void* data) {
	StateData* stateData = (StateData*)instance;
	switch ((PortIndex)port) {
	case CV_INPUT: stateData->cv_input = (float*)data; break;
	case CV_OUTPUT: stateData->cv_output = (float*)data; break;
	case CURVE: stateData->curve = (float*)data; break;
	case INPUT_VALUE: stateData->input_value = (float*)data; break;
	case OUTPUT_VALUE: stateData->output_value = (float*)data; break;
	}
}
static void activate(LV2_Handle instance) { }

static float absf(float input) {
	if (input < 0.0) return input * -1.0;
	else return input;
}

static void run(LV2_Handle instance, uint32_t n_samples) {
	StateData* stateData = (StateData*)instance;
	float* const cv_output = stateData->cv_output;
	float* const cv_input = stateData->cv_input;
	const float curve = *(stateData->curve);
	// The curve only changes per block, so compute its exponents once instead of for every sample.
	const float coef = powf(2 + curve * .123, curve);
	const float inv_coef = 1.0 / coef;
	// Read the last input sample before the loop in case the host runs us in place (input and output sharing a buffer).
	const float last_input = n_samples > 0 ? cv_input[n_samples - 1] : 0.0f;
	for (uint32_t pos = 0; pos < n_samples; pos++) {
		float input = cv_input[pos];
		input = input / 10.0;
		input = input - 1;
		input = powf(absf(1.0 - powf(absf(input), coef)), inv_coef);
		input = input * 10.0;
		cv_output[pos] = input;
	}
	// Report the latest input and output voltages on control ports so the GUI can show them
	// (a GUI cannot read a CV port).
	if (n_samples > 0) {
		if (stateData->input_value) *(stateData->input_value) = last_input;
		if (stateData->output_value) *(stateData->output_value) = cv_output[n_samples - 1];
	}
}
static void deactivate(LV2_Handle instance){}
static void cleanup(LV2_Handle instance) {
	free(instance);
}
static const void* extension_data(const char* uri) {
	return NULL;
}
static const LV2_Descriptor descriptor = {
	PLUGIN_URI,
	instantiate,
	connect_port,
	activate,
	run,
	deactivate,
	cleanup,
	extension_data
};
LV2_SYMBOL_EXPORT
const LV2_Descriptor* lv2_descriptor(uint32_t index)
{
	switch (index) {
		case 0:  return &descriptor;
		default: return NULL;
	}
}
