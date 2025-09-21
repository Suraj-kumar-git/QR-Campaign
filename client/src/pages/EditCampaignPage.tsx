import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Edit, Loader2, Upload, X, CalendarIcon, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfDay, isBefore, isAfter, parse, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Campaign } from "@shared/schema";

interface EditCampaignPageProps {
  campaignId: string;
}

export function EditCampaignPage({ campaignId }: EditCampaignPageProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    startDate: "",
    endDate: "",
    startTime: "00:00",
    endTime: "23:59",
    scanLimit: "",
    borderStyle: "none" as "thick" | "none",
    targetUrl: "",
  });
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [startDateValue, setStartDateValue] = useState<Date | undefined>();
  const [endDateValue, setEndDateValue] = useState<Date | undefined>();
  const [formTouched, setFormTouched] = useState({
    category: false,
    startDate: false,
    endDate: false,
    startTime: false,
    endTime: false,
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState(0);

  // Fetch campaign data
  const { data: campaign, isLoading: campaignLoading, error: campaignError } = useQuery<Campaign>({
    queryKey: ['/api/campaigns', campaignId],
  });

  // Check if campaign has started (using full datetime, not just date)
  const campaignHasStarted = campaign ? new Date(campaign.startDate) <= new Date() : false;


  // Pre-fill form data when campaign loads
  useEffect(() => {
    if (campaign) {
      // Convert dates to local format for form
      const startDate = new Date(campaign.startDate);
      const endDate = new Date(campaign.endDate);
      
      setFormData({
        name: campaign.name,
        description: campaign.description || "",
        category: campaign.category,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        startTime: format(startDate, "HH:mm"),
        endTime: format(endDate, "HH:mm"),
        scanLimit: campaign.scanLimit ? campaign.scanLimit.toString() : "",
        borderStyle: campaign.borderStyle || "none",
        targetUrl: campaign.targetUrl || "",
      });
      
      setStartDateValue(startDate);
      setEndDateValue(endDate);
      setDescriptionLength(campaign.description?.length || 0);
      
      // Set existing icon preview if available
      if (campaign.iconPath) {
        setIconPreview(`/uploads/${campaign.iconPath}`);
      }
    }
  }, [campaign]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updateData: any) => {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update campaign');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', campaignId] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === '/api/campaigns/live'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      
      toast({
        title: "Campaign updated successfully!",
        description: `"${formData.name}" has been updated.`,
      });
      
      // Redirect to campaigns list
      setLocation("/qr");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update campaign",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    const finalCategory = isAddingNewCategory ? newCategoryName.trim() : formData.category;
    if (!finalCategory) {
      toast({
        title: "Validation Error",
        description: "Please select or enter a category.",
        variant: "destructive",
      });
      return;
    }
    
    // Date and time validation using proper timezone-aware parsing
    const now = new Date();
    const todayStart = startOfDay(new Date());
    
    const startDateParsed = parse(formData.startDate, 'yyyy-MM-dd', new Date());
    const endDateParsed = parse(formData.endDate, 'yyyy-MM-dd', new Date());
    
    // Create full datetime objects for more precise validation
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);
    
    // Only validate start date/time if campaign hasn't started yet
    if (!campaignHasStarted) {
      if (isBefore(startDateParsed, todayStart)) {
        toast({
          title: "Invalid Start Date",
          description: "Start date cannot be in the past.",
          variant: "destructive",
        });
        return;
      }
      
      // Time validation for same-day campaigns using proper Date objects
      if (isSameDay(startDateParsed, todayStart)) {
        const currentDateTime = new Date();
        if (startDateTime <= currentDateTime) {
          toast({
            title: "Invalid Start Time",
            description: "Start time cannot be earlier than current time for today's campaigns.",
            variant: "destructive",
          });
          return;
        }
      }
    }
    
    // Always validate that end date is not before start date
    if (isBefore(endDateParsed, startDateParsed)) {
      toast({
        title: "Invalid End Date",
        description: "End date must be on or after the start date.",
        variant: "destructive",
      });
      return;
    }
    
    // Always validate that end date/time is in the future
    if (isBefore(endDateTime, now)) {
      toast({
        title: "Invalid End Date/Time",
        description: "End date and time must be in the future.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure end time is after start time for same-day campaigns using Date objects
    if (isSameDay(startDateParsed, endDateParsed) && endDateTime <= startDateTime) {
      toast({
        title: "Invalid End Time",
        description: "End time must be after start time for same-day campaigns.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      let iconPath = campaign?.iconPath; // Keep existing icon if no new one uploaded
      
      // Upload icon file if provided
      if (iconFile) {
        const formData = new FormData();
        formData.append('icon', iconFile);
        
        const uploadResponse = await fetch('/api/upload/icon', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload icon');
        }
        
        const uploadResult = await uploadResponse.json();
        iconPath = uploadResult.iconPath;
      }
      
      // Prepare campaign data with proper timezone handling
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);
      
      const campaignData = {
        name: formData.name,
        description: formData.description,
        category: finalCategory,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        iconPath,
        borderStyle: formData.borderStyle,
        ...(formData.targetUrl && { targetUrl: formData.targetUrl }),
      };
      
      // Add scan limit if provided
      if (formData.scanLimit && parseInt(formData.scanLimit) > 0) {
        (campaignData as any).scanLimit = parseInt(formData.scanLimit);
      }

      updateMutation.mutate(campaignData);
    } catch (error) {
      console.error('Campaign update error:', error);
      toast({
        title: "Failed to update campaign",
        description: "An error occurred while updating the campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    let value = e.target.value;
    
    // Handle description character limit
    if (field === "description" && value.length > 200) {
      value = value.substring(0, 200);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    if (field in formTouched) {
      setFormTouched(prev => ({ ...prev, [field]: true }));
    }
    
    if (field === "description") {
      setDescriptionLength(value.length);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveIcon = () => {
    setIconFile(null);
    setIconPreview(campaign?.iconPath ? `/uploads/${campaign.iconPath}` : null);
  };
  
  const handleBorderStyleChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, borderStyle: checked ? "thick" : "none" }));
  };
  
  const handleCategoryChange = (value: string) => {
    setFormTouched(prev => ({ ...prev, category: true }));
    if (value === "new-category") {
      setIsAddingNewCategory(true);
      setNewCategoryName("");
      setFormData(prev => ({ ...prev, category: "" }));
    } else {
      setIsAddingNewCategory(false);
      setNewCategoryName("");
      setFormData(prev => ({ ...prev, category: value }));
    }
  };
  
  const handleDateSelect = (field: "startDate" | "endDate") => (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, "yyyy-MM-dd");
      setFormData(prev => ({ ...prev, [field]: dateString }));
      setFormTouched(prev => ({ ...prev, [field]: true }));
      
      if (field === "startDate") {
        setStartDateValue(date);
        setStartDateOpen(false);
      } else {
        setEndDateValue(date);
        setEndDateOpen(false);
      }
    }
  };
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/campaigns/categories', {
          credentials: 'include',
        });
        if (response.ok) {
          const categoryData = await response.json();
          setCategories(categoryData);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Show loading state while fetching campaign
  if (campaignLoading) {
    return (
      <div className="flex justify-center items-center h-64" data-testid="loading-edit-campaign">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading campaign...</span>
      </div>
    );
  }

  // Show error if campaign not found or failed to load
  if (campaignError || !campaign) {
    return (
      <div className="space-y-6" data-testid="edit-campaign-error">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Campaign not found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              The campaign you're trying to edit doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => setLocation("/qr")}>
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if campaign is editable
  if (campaign.status !== "active") {
    return (
      <div className="space-y-6" data-testid="edit-campaign-not-editable">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Campaign cannot be edited
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Only active campaigns can be edited. This campaign is {campaign.status}.
            </p>
            <Button onClick={() => setLocation("/qr")}>
              Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="edit-campaign-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
            Edit Campaign
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2" data-testid="page-description">
            Modify your campaign details and settings.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Campaign Details</span>
              </CardTitle>
              <CardDescription>
                Update the information below to modify your campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" data-testid="edit-campaign-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Campaign Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange("name")}
                      placeholder="Enter campaign name"
                      required
                      data-testid="input-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    {isAddingNewCategory ? (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Enter new category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          required
                          data-testid="input-new-category"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsAddingNewCategory(false);
                              setNewCategoryName("");
                            }}
                            data-testid="button-cancel-new-category"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Select 
                        value={formData.category} 
                        onValueChange={handleCategoryChange}
                        required
                      >
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                          <SelectItem value="new-category">
                            + Add new category
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!isAddingNewCategory && !formData.category && formTouched.category && (
                      <p className="text-xs text-red-600">
                        Please select a category
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description 
                    <span className="text-sm text-gray-500 font-normal">({descriptionLength}/200)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleChange("description")}
                    placeholder="Describe your campaign goals and messaging (max 200 characters)"
                    rows={3}
                    data-testid="input-description"
                  />
                  {descriptionLength > 180 && (
                    <p className="text-xs text-amber-600">
                      {200 - descriptionLength} characters remaining
                    </p>
                  )}
                </div>

                {/* Custom URL for QR Code */}
                <div className="space-y-2">
                  <Label htmlFor="targetUrl" className="flex items-center gap-2">
                    Custom QR Code URL
                    <span className="text-sm text-gray-500 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="targetUrl"
                    type="url"
                    value={formData.targetUrl}
                    onChange={handleChange("targetUrl")}
                    placeholder="https://example.com/your-landing-page"
                    data-testid="input-target-url"
                  />
                  <p className="text-xs text-gray-500">
                    When someone scans your QR code, they'll be redirected to this URL. If left empty, they'll see the campaign details page.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scanLimit">Scan Limit (Optional)</Label>
                  <Input
                    id="scanLimit"
                    type="number"
                    value={formData.scanLimit}
                    onChange={handleChange("scanLimit")}
                    placeholder="e.g., 1000 (leave empty for unlimited)"
                    min="1"
                    data-testid="input-scan-limit"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Set a maximum number of scans before the QR code becomes inactive
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="iconUpload">QR Code Icon (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    {iconPreview ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={iconPreview} 
                            alt="Icon preview" 
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="text-sm font-medium">{iconFile?.name || 'Current icon'}</p>
                            <p className="text-xs text-gray-500">{iconFile ? Math.round((iconFile?.size || 0) / 1024) + ' KB' : 'Existing'}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveIcon}
                          data-testid="button-remove-icon"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="mt-2">
                          <Label htmlFor="iconUpload" className="cursor-pointer">
                            <span className="text-blue-600 hover:text-blue-500">Upload an icon</span>
                            <span className="text-gray-500"> or drag and drop</span>
                          </Label>
                          <Input
                            id="iconUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            data-testid="input-icon-upload"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="borderStyle"
                    checked={formData.borderStyle === "thick"}
                    onCheckedChange={handleBorderStyleChange}
                    data-testid="checkbox-border"
                  />
                  <Label htmlFor="borderStyle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Add thick border to QR code
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>Start Date</span>
                    </Label>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground",
                            campaignHasStarted && "opacity-50 cursor-not-allowed"
                          )}
                          disabled={campaignHasStarted}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(new Date(formData.startDate), "PPP")
                          ) : (
                            <span>Pick a start date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDateValue}
                          onSelect={handleDateSelect("startDate")}
                          disabled={(date) => campaignHasStarted || isBefore(startOfDay(date), startOfDay(new Date()))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      {campaignHasStarted ? "Campaign has already started - start date cannot be changed" : "Cannot be earlier than today"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <CalendarIcon className="w-4 h-4" />
                      <span>End Date</span>
                    </Label>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? (
                            format(new Date(formData.endDate), "PPP")
                          ) : (
                            <span>Pick an end date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDateValue}
                          onSelect={handleDateSelect("endDate")}
                          disabled={(date) => {
                            const todayStart = startOfDay(new Date());
                            const minDate = formData.startDate ? startOfDay(new Date(formData.startDate)) : todayStart;
                            // Always ensure end date can't be in the past
                            return isBefore(startOfDay(date), minDate) || isBefore(startOfDay(date), todayStart);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500">
                      Must be on or after the start date and cannot be in the past
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Start Time</span>
                    </Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={handleChange("startTime")}
                      required
                      disabled={campaignHasStarted}
                      className={campaignHasStarted ? "opacity-50 cursor-not-allowed" : ""}
                      data-testid="input-start-time"
                    />
                    {campaignHasStarted ? (
                      <p className="text-xs text-gray-500">
                        Campaign has already started - start time cannot be changed
                      </p>
                    ) : (
                      formData.startDate === format(new Date(), "yyyy-MM-dd") && (
                        <p className="text-xs text-gray-500">
                          Must be later than current time for today's campaigns
                        </p>
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>End Time</span>
                    </Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={handleChange("endTime")}
                      required
                      data-testid="input-end-time"
                    />
                    <p className="text-xs text-gray-500">
                      Must be after start time for same-day campaigns and must be in the future
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/qr")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {isLoading || updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Updating Campaign...
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Update Campaign
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}